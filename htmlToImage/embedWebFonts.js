import { toArray } from './util.js';
import { shouldEmbed, embedResources } from './embedResources.js';
const cssFetchCache = {};
function fetchCSS(url) {
    const cache = cssFetchCache[url];
    if (cache != null) {
        return cache;
    }
    const deferred = window.fetch(url).then((res) => ({
        url,
        cssText: res.text(),
    }));
    cssFetchCache[url] = deferred;
    return deferred;
}
async function embedFonts(meta, options) {
    return meta.cssText.then((raw) => {
        let cssText = raw;
        const regexUrl = /url\(["']?([^"')]+)["']?\)/g;
        const fontLocs = cssText.match(/url\([^)]+\)/g) || [];
        const loadFonts = fontLocs.map((location) => {
            let url = location.replace(regexUrl, '$1');
            if (!url.startsWith('https://')) {
                url = new URL(url, meta.url).href;
            }
            // eslint-disable-next-line promise/no-nesting
            return window
                .fetch(url, options.fetchRequestInit)
                .then((res) => res.blob())
                .then((blob) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    // Side Effect
                    cssText = cssText.replace(location, `url(${reader.result})`);
                    resolve([location, reader.result]);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }));
        });
        // eslint-disable-next-line promise/no-nesting
        return Promise.all(loadFonts).then(() => cssText);
    });
}
function parseCSS(source) {
    if (source == null) {
        return [];
    }
    const result = [];
    const commentsRegex = /(\/\*[\s\S]*?\*\/)/gi;
    // strip out comments
    let cssText = source.replace(commentsRegex, '');
    const keyframesRegex = new RegExp('((@.*?keyframes [\\s\\S]*?){([\\s\\S]*?}\\s*?)})', 'gi');
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const matches = keyframesRegex.exec(cssText);
        if (matches === null) {
            break;
        }
        result.push(matches[0]);
    }
    cssText = cssText.replace(keyframesRegex, '');
    const importRegex = /@import[\s\S]*?url\([^)]*\)[\s\S]*?;/gi;
    // to match css & media queries together
    const combinedCSSRegex = '((\\s*?(?:\\/\\*[\\s\\S]*?\\*\\/)?\\s*?@media[\\s\\S]' +
        '*?){([\\s\\S]*?)}\\s*?})|(([\\s\\S]*?){([\\s\\S]*?)})';
    // unified regex
    const unifiedRegex = new RegExp(combinedCSSRegex, 'gi');
    // eslint-disable-next-line no-constant-condition
    while (true) {
        let matches = importRegex.exec(cssText);
        if (matches === null) {
            matches = unifiedRegex.exec(cssText);
            if (matches === null) {
                break;
            }
            else {
                importRegex.lastIndex = unifiedRegex.lastIndex;
            }
        }
        else {
            unifiedRegex.lastIndex = importRegex.lastIndex;
        }
        result.push(matches[0]);
    }
    return result;
}
async function getCSSRules(styleSheets, options) {
    const ret = [];
    const deferreds = [];
    const inlineSheet = styleSheets.find((a) => a.href == null) || document.styleSheets[0];
    const effectiveSheets = [inlineSheet];
    // First loop inlines imports
    styleSheets.forEach((sheet) => {
        if ('cssRules' in sheet) {
            try {
                toArray(sheet.cssRules).forEach((item, index) => {
                    if (item.type === CSSRule.IMPORT_RULE) {
                        let importIndex = index + 1;
                        const url = item.href;
                        const deferred = fetchCSS(url)
                            .then((metadata) => metadata ? embedFonts(metadata, options) : '')
                            .then((cssText) => parseCSS(cssText).forEach((rule) => {
                            try {
                                sheet.insertRule(rule, rule.startsWith('@import')
                                    ? (importIndex += 1)
                                    : sheet.cssRules.length);
                            }
                            catch (error) {
                                console.error('Error inserting rule from remote css', {
                                    rule,
                                    error,
                                });
                            }
                        }))
                            .catch((e) => {
                            console.error('Error loading remote css', e.toString());
                        });
                        effectiveSheets.push(sheet);
                        deferreds.push(deferred);
                    }
                });
            }
            catch (e) {
                if (sheet.href != null) {
                    deferreds.push(fetchCSS(sheet.href)
                        .then((metadata) => metadata ? embedFonts(metadata, options) : '')
                        .then((cssText) => parseCSS(cssText).forEach((rule) => {
                        inlineSheet.insertRule(rule, inlineSheet.cssRules.length);
                    }))
                        .catch((err) => {
                        console.error('Error loading remote stylesheet', err.toString());
                    }));
                }
                else {
                    console.error('Error inlining remote css file', e.toString());
                }
            }
        }
    });
    return Promise.all(deferreds).then(() => {
        // Second loop parses rules
        effectiveSheets.forEach((sheet) => {
            if ('cssRules' in sheet) {
                try {
                    toArray(sheet.cssRules).forEach((item) => {
                        ret.push(item);
                    });
                }
                catch (e) {
                    console.error(`Error while reading CSS rules from ${sheet.href}`, e.toString());
                }
            }
        });
        return ret;
    });
}
function getWebFontRules(cssRules) {
    return cssRules
        .filter((rule) => rule.type === CSSRule.FONT_FACE_RULE)
        .filter((rule) => shouldEmbed(rule.style.getPropertyValue('src')));
}
async function parseWebFontRules(node, options) {
    return new Promise((resolve, reject) => {
        if (node.ownerDocument == null) {
            reject(new Error('Provided element is not within a Document'));
        }
        resolve(toArray(node.ownerDocument.styleSheets));
    })
        .then((styleSheets) => getCSSRules(styleSheets, options))
        .then(getWebFontRules);
}
export async function getWebFontCSS(node, options) {
    return parseWebFontRules(node, options)
        .then((rules) => Promise.all(rules.map((rule) => {
        const baseUrl = rule.parentStyleSheet
            ? rule.parentStyleSheet.href
            : null;
        return embedResources(rule.cssText, baseUrl, options);
    })))
        .then((cssTexts) => cssTexts.join('\n'));
}
export async function embedWebFonts(clonedNode, options) {
    return (options.fontEmbedCSS != null
        ? Promise.resolve(options.fontEmbedCSS)
        : getWebFontCSS(clonedNode, options)).then((cssText) => {
        const styleNode = document.createElement('style');
        const sytleContent = document.createTextNode(cssText);
        styleNode.appendChild(sytleContent);
        if (clonedNode.firstChild) {
            clonedNode.insertBefore(styleNode, clonedNode.firstChild);
        }
        else {
            clonedNode.appendChild(styleNode);
        }
        return clonedNode;
    });
}