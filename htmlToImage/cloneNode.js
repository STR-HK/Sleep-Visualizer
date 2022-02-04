import { getBlobFromURL } from './getBlobFromURL.js';
import { clonePseudoElements } from './clonePseudoElements.js';
import { createImage, getMimeType, makeDataUrl, toArray } from './util.js';
async function cloneCanvasElement(node) {
    const dataURL = node.toDataURL();
    if (dataURL === 'data:,') {
        return Promise.resolve(node.cloneNode(false));
    }
    return createImage(dataURL);
}
async function cloneVideoElement(node, options) {
    return Promise.resolve(node.poster)
        .then((url) => getBlobFromURL(url, options))
        .then((data) => makeDataUrl(data.blob, getMimeType(node.poster) || data.contentType))
        .then((dataURL) => createImage(dataURL));
}
async function cloneSingleNode(node, options) {
    if (node instanceof HTMLCanvasElement) {
        return cloneCanvasElement(node);
    }
    if (node instanceof HTMLVideoElement && node.poster) {
        return cloneVideoElement(node, options);
    }
    return Promise.resolve(node.cloneNode(false));
}
const isSlotElement = (node) => node.tagName != null && node.tagName.toUpperCase() === 'SLOT';
async function cloneChildren(nativeNode, clonedNode, options) {
    const children = isSlotElement(nativeNode) && nativeNode.assignedNodes
        ? toArray(nativeNode.assignedNodes())
        : toArray((nativeNode.shadowRoot ?? nativeNode).childNodes);
    if (children.length === 0 || nativeNode instanceof HTMLVideoElement) {
        return Promise.resolve(clonedNode);
    }
    return children
        .reduce((deferred, child) => deferred
        // eslint-disable-next-line no-use-before-define
        .then(() => cloneNode(child, options))
        .then((clonedChild) => {
        // eslint-disable-next-line promise/always-return
        if (clonedChild) {
            clonedNode.appendChild(clonedChild);
        }
    }), Promise.resolve())
        .then(() => clonedNode);
}
function deprioritizeWebkitComparator(a, b) {
    if (a.startsWith('-webkit-')) {
        if (!b.startsWith('-webkit-')) {
            return -1;
        }
    }
    else if (b.startsWith('-webkit-')) {
        return 1;
    }
    return 0;
}
function cloneCSSStyle(nativeNode, clonedNode) {
    const source = window.getComputedStyle(nativeNode);
    const target = clonedNode.style;
    if (!target) {
        return;
    }
    toArray(source)
        .sort(deprioritizeWebkitComparator)
        .forEach((name) => {
        target.setProperty(name, source.getPropertyValue(name), source.getPropertyPriority(name));
    });
}
function cloneInputValue(nativeNode, clonedNode) {
    if (nativeNode instanceof HTMLTextAreaElement) {
        clonedNode.innerHTML = nativeNode.value;
    }
    if (nativeNode instanceof HTMLInputElement) {
        clonedNode.setAttribute('value', nativeNode.value);
    }
}
async function decorate(nativeNode, clonedNode) {
    if (!(clonedNode instanceof Element)) {
        return Promise.resolve(clonedNode);
    }
    return Promise.resolve()
        .then(() => cloneCSSStyle(nativeNode, clonedNode))
        .then(() => clonePseudoElements(nativeNode, clonedNode))
        .then(() => cloneInputValue(nativeNode, clonedNode))
        .then(() => clonedNode);
}
export async function cloneNode(node, options, isRoot) {
    if (!isRoot && options.filter && !options.filter(node)) {
        return Promise.resolve(null);
    }
    return Promise.resolve(node)
        .then((clonedNode) => cloneSingleNode(clonedNode, options))
        .then((clonedNode) => cloneChildren(node, clonedNode, options))
        .then((clonedNode) => decorate(node, clonedNode));
}