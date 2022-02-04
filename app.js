function convert(time) {
    time = parseInt(time)
    if ( 21 <= time && time <= 23 ) {
        return time - 20
    } else {
        return time + 4
    }
}

let s = '2231'
let e = '0412'

class Custom {
    constructor () {
        this.log = function () {
            let args = Array.from(arguments)[0]
            Object.keys(args).forEach(key => {
                console.log(`${key}: ${args[key]}`)
            })
        }
    }
}

function editSvg (url, editFunction) {
    return new Promise(
        function (resolve) {
            let xhr = new XMLHttpRequest()
            xhr.open('GET', url, true)
            xhr.overrideMimeType('image/svg+xml')
            xhr.onload = () => {
                if (xhr.status == 200) {
                    let element = xhr.responseXML.documentElement
                
                    if ( typeof editFunction == 'function' ) {
                        element = editFunction(element)
                    }
                
                    let blob = new Blob([element.outerHTML], { type: 'image/svg+xml' })
                    url = URL.createObjectURL(blob)
                
                    resolve(url)
                }
            }
            xhr.send()
        }
    )
}

// let good = editSvg('good.svg', function (element) {
//     element.style.fill = 'green'
//     return element
// }).then((url) => {
//     good = url
//     console.log(good)
// })


function createSmall(type) {
    if (type == 'time') {
        let time = document.createElement('time')
        time.classList.add('time')
        return time
    } else if (type == 'view') {
        let view = document.createElement('view')
        view.classList.add('view')
        return view
    } else {
        console.error('Unexpected type')
    }
}

function makeContainer () {
    let container = document.createElement('div')
    container.classList.add('container')


    let timeContainer = document.createElement('div')
    timeContainer.classList.add('time-container')


    // timeContainer.appendChild(createSmall('time'))
    for (let i = 21; i <= 23; i++) {
        let time = createSmall('time')
        time.innerHTML = i
        timeContainer.appendChild(time)

        if ( i % 2 == 0 ) {
            time.classList.add('even')
        } else {
            time.classList.add('odd')
        }
    }
    for (let i = 0; i <= 20; i++) {
        let time = createSmall('time')
        time.innerHTML = i.toString().padStart(2, '0')
        timeContainer.appendChild(time)

        if ( i % 2 == 0 ) {
            time.classList.add('even')
        } else {
            time.classList.add('odd')
        }
    }
    // timeContainer.appendChild(createSmall('time'))


    let viewContainer = document.createElement('div')
    viewContainer.classList.add('view-container')


    for (let i = 0; i < 24; i++) {
        let view = createSmall('view')
        viewContainer.appendChild(view)
    }

    container.appendChild(timeContainer)
    container.appendChild(viewContainer)

    return container
}

let createStack = []
window.cs = createStack

function create(s, e, date) {
    createStack.push([s, e, date])

    let hourS = parseInt(s.slice(0, 2))
    let hourE = parseInt(e.slice(0, 2))

    let minuteS = parseInt(s.slice(2, 4))
    let minuteE = parseInt(e.slice(2, 4))

    if ( minuteS >= 30 ) {
        hourS = parseInt(hourS) + 1
    }

    if ( minuteE >= 30 ) {
        hourE = parseInt(hourE) + 1
    }

    if ( hourS == 24 ) {
        hourS = 0
    }

    if ( hourE == 24 ) {
        hourE = 0
    }

    let hourSum = 0
    let minuteSum = 0

    console.log({date})

    if ( hourS >= 21 && hourS <= 23 ) {

        hourSum += 23 - hourS
        minuteSum += 59 - minuteS

        hourSum += hourE
        minuteSum += minuteE

        // console.log(`${23 - hourS}:${59 - minuteS}`)

        // console.log(`${hourE}:${minuteE}`)
    } else {
        // console.log(`${hourS}:${minuteS}`)

        if ( minuteE - minuteS < 0 ) {
            hourSum += hourE - hourS
            minuteSum += 60 - (minuteS - minuteE)
            
            // console.log('ex ')
            // console.log(`${hourE - hourS}:${60 - minuteS}`)
        } else {
            hourSum += hourE - hourS
            minuteSum += minuteE - minuteS
            // console.log(`${hourE - hourS}:${minuteE - minuteS}`)
        }
    }

    if ( minuteSum >= 60 ) {
        hourSum += Math.floor(minuteSum / 60)
        minuteSum = minuteSum % 60
    }

    console.log(`${hourSum}h ${minuteSum}m`)

    let convertedS = convert(hourS)
    let convertedE = convert(hourE)

    let container = makeContainer()

    let firstLine = document.createElement('div')
    firstLine.classList.add('first-line')
    container.insertBefore(firstLine, container.firstChild)

    let statusViewer = document.createElement('div')
    statusViewer.classList.add('status-viewer')
    firstLine.appendChild(statusViewer)

    let lengthViewer = document.createElement('div')
    lengthViewer.classList.add('length-viewer')
    lengthViewer.innerHTML = `${hourSum}h ${minuteSum}m`
    // container.insertBefore(lengthViewer, container.firstChild)
    container.firstChild.appendChild(lengthViewer)

    let dateViewer = document.createElement('div')
    dateViewer.classList.add('date-viewer')
    dateViewer.innerHTML = date
    // container.insertBefore(dateViewer, container.firstChild)
    container.appendChild(dateViewer)

    let viewContainer = container.getElementsByClassName('view-container')[0]

    let views = viewContainer.children
    for (let i = 0; i <= (convertedE - convertedS); i++) {
        let view = views[i + convertedS - 1]
        if ( i == 0 ) {
            view.classList.add('start')
        }
        if ( i == (convertedE - convertedS) ) {
            view.classList.add('end')
        }
        view.classList.add('active')
    }

    document.getElementById('body').appendChild(container)
}

function redraw() {
    let size = window.innerWidth
    if ( size < 768 ) {
        console.log('mobile, remove even')
        Array.from(document.getElementsByClassName('even')).forEach(e => {
            // console.log(e)
            e.remove()
        })
        Array.from(document.getElementsByClassName('odd')).forEach(e => {
            e.style.fontSize = 'x-small'
        })

        document.getElementsByClassName('title')[0].style.fontSize = 'large'
    } else if ( size >= 768 ) {
        console.log('tablet || desktop, redraw all')
        Array.from(document.getElementsByClassName('container')).forEach(e => {
            // console.log(e)
            e.remove()
        })
        let how = createStack.length
        createStack.forEach(e => {
            create(e[0], e[1], e[2])
            // console.log(createStack)
            
        })
        for (let h=0; h<how; h++) {
            createStack.shift()
        }

        document.getElementsByClassName('title')[0].style.fontSize = ''

    }
}

window.addEventListener('resize', function () {
    redraw()
})


let custom = new Custom()



create('0337', '1100', '12022 / 01 / 01')
create('0548', '1049', '12022 / 01 / 02')
create('0452', '1121', '12022 / 01 / 03')
create('0320', '1345', '12022 / 01 / 04')
create('0339', '1200', '12022 / 01 / 05')
create('0540', '1340', '12022 / 01 / 06')
create('0701', '1303', '12022 / 01 / 07')
create('0521', '0759', '12022 / 01 / 08')
create('0649', '1430', '12022 / 01 / 09')
create('2252', '0322', '12022 / 01 / 09 - 2')
create('0520', '0825', '12022 / 01 / 10')
create('0718', '1339', '12022 / 01 / 11')
create('0007', '0426', '12022 / 01 / 12')
create('0608', '1459', '12022 / 01 / 13')
create('0513', '0807', '12022 / 01 / 14')
create('0100', '0350', '12022 / 01 / 15')
create('0018', '0512', '12022 / 01 / 16')
create('2336', '0312', '12022 / 01 / 17')
create('0613', '1052', '12022 / 01 / 17 - 2')
create('2311', '0717', '12022 / 01 / 18')
create('2232', '0456', '12022 / 01 / 19')
create('2341', '0418', '12022 / 01 / 20')
create('0442', '0800', '12022 / 01 / 21')
create('2259', '0450', '12022 / 01 / 22')
create('2339', '0526', '12022 / 01 / 23')
create('0000', '0452', '12022 / 01 / 24')
create('2240', '0424', '12022 / 01 / 25')
create('2339', '0500', '12022 / 01 / 26')
create('2327', '0429', '12022 / 01 / 27')
create('0517', '0808', '12022 / 01 / 28')
create('2030', '0024', '12022 / 01 / 29') // 1953인데 렌더 불가처리
create('0233', '0503', '12022 / 01 / 29 - 2')
create('2038', '0012', '12022 / 01 / 30')
create('0302', '0820', '12022 / 01 / 30 - 2')
create('2325', '0416', '12022 / 01 / 31')













window.dispatchEvent(new Event('resize'))


import * as htmlToImage from './htmlToImage/index.js';
import { toPng, toJpeg, toBlob, toPixelData, toSvg } from './htmlToImage/index.js';


function filter (node) {
    return (node.tagName !== 'i');
  }

htmlToImage.toPng(
    document.getElementById('app'),
    { filter: filter }
    ).then(function (dataUrl) {
        var link = document.createElement('a');
        link.download = 'my-image-name.svg';
        link.href = dataUrl;
        link.click();
});
