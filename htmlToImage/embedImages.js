import { getBlobFromURL } from './getBlobFromURL.js';
import { embedResources } from './embedResources.js';
import { getMimeType, isDataUrl, makeDataUrl, toArray } from './util.js';
async function embedBackground(clonedNode, options) {
    const background = clonedNode.style?.getPropertyValue('background');
    if (!background) {
        return Promise.resolve(clonedNode);
    }
    return Promise.resolve(background)
        .then((cssString) => embedResources(cssString, null, options))
        .then((cssString) => {
        clonedNode.style.setProperty('background', cssString, clonedNode.style.getPropertyPriority('background'));
        return clonedNode;
    });
}
async function embedBorderImage(clonedNode, options) {
    await Promise.all([
        new Promise((resolve, reject) => {
            const source = clonedNode.style?.getPropertyValue('border-image-source');
            if (!source) {
                resolve(clonedNode);
                return;
            }
            Promise.resolve(source)
                .then((cssString) => embedResources(cssString, null, options))
                .then((cssString) => {
                const priority = clonedNode.style.getPropertyPriority('border-image-source');
                clonedNode.style.removeProperty('-webkit-border-image-source');
                clonedNode.style.setProperty('border-image-source', cssString, priority);
                return clonedNode;
            })
                .then(resolve)
                .catch(reject);
        }),
        new Promise((resolve, reject) => {
            const source = clonedNode.style?.getPropertyValue('border-image');
            if (!source) {
                resolve(clonedNode);
                return;
            }
            Promise.resolve(source)
                .then((cssString) => embedResources(cssString, null, options))
                .then((cssString) => {
                const priority = clonedNode.style.getPropertyPriority('border-image');
                clonedNode.style.removeProperty('-webkit-border-image');
                clonedNode.style.setProperty('border-image', cssString, priority);
                return clonedNode;
            })
                .then(resolve)
                .catch(reject);
        }),
    ]);
    return clonedNode;
}
async function embedImageNode(clonedNode, options) {
    if (!(clonedNode instanceof HTMLImageElement && !isDataUrl(clonedNode.src)) &&
        !(clonedNode instanceof SVGImageElement &&
            !isDataUrl(clonedNode.href.baseVal))) {
        return Promise.resolve(clonedNode);
    }
    const src = clonedNode instanceof HTMLImageElement
        ? clonedNode.src
        : clonedNode.href.baseVal;
    return Promise.resolve(src)
        .then((url) => getBlobFromURL(url, options))
        .then((data) => makeDataUrl(data.blob, getMimeType(src) || data.contentType))
        .then((dataURL) => new Promise((resolve, reject) => {
        clonedNode.onload = resolve;
        clonedNode.onerror = reject;
        if (clonedNode instanceof HTMLImageElement) {
            clonedNode.srcset = '';
            clonedNode.src = dataURL;
        }
        else {
            clonedNode.href.baseVal = dataURL;
        }
    }))
        .then(() => clonedNode, () => clonedNode);
}
async function embedChildren(clonedNode, options) {
    const children = toArray(clonedNode.childNodes);
    // eslint-disable-next-line no-use-before-define
    const deferreds = children.map((child) => embedImages(child, options));
    return Promise.all(deferreds).then(() => clonedNode);
}
export async function embedImages(clonedNode, options) {
    if (!(clonedNode instanceof Element)) {
        return Promise.resolve(clonedNode);
    }
    return Promise.resolve(clonedNode)
        .then((node) => embedBackground(node, options))
        .then((node) => embedBorderImage(node, options))
        .then((node) => embedImageNode(node, options))
        .then((node) => embedChildren(node, options));
}