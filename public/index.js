
window.addEventListener('load', () => {
    if(!channel) return

    const converter = window.index.NumberToChineseWords
    const socket = io()
    const nicks = {}
    let lastDate = new Date(0)

    socket.on('connect', () => {
        socket.emit('join', {nick, channel})
        
        const double = channel.startsWith('##')
        const doublePrefix = double ? 'double/' : ''
        const channelName = channel.replace(/\#/g, '')
        $.ajax({
            url: '/logs/' + doublePrefix + channelName + '/',
            success: (data) => {
                const messages = data.split('\n')
                for(const message of messages) {
                    if(message.trim() != '')appendMessage(message)
                }
            }
        })
    })

    $('#write').submit((event) => {
        event.preventDefault()
        const text = $('#message').val()
        if(text.trim() != '') socket.emit('message', text)
        $('#message').val('')
    })

    socket.on('nick', (data) => {
        for(key of Object.keys(data)) nicks[key] = data[key]
    })

    socket.on('message', (msg) => {
        appendMessage(msg)
    })

    socket.on('close', () => {
        location.reload()
    })

    const convertDate = (date) => {
        const year = converter.toWords(date.getFullYear()) + '年'
        const month = converter.toWords(date.getMonth() + 1) + '月'
        const day = converter.toWords(date.getDate()) + '日'
        const hours = converter.toWords(date.getHours()) + '時'
        const minutes = converter.toWords(date.getMinutes()) + '分'
        const seconds = converter.toWords(date.getSeconds()) + '秒'
        return {year, month, day, hours, minutes, seconds}
    }

    const diffHanDate = (past, present, hanDate) => {
        let result = ''
        if(past.getYear() != present.getYear()) result += hanDate.year
        if(result || past.getMonth() != present.getMonth()) result += hanDate.month
        if(result || past.getDay() != present.getDay()) result += hanDate.day
        if(result || past.getHours() != present.getHours()) result += hanDate.hours
        if(result || past.getMinutes() != present.getMinutes()) result += hanDate.minutes
        // if(result || past.getSeconds() != present.getSeconds()) result += hanDate.seconds
        return result
    }

    const appendMessage = (msg) => {
        const i1 = msg.indexOf(' - ')
        const i2 = msg.indexOf(': ')

        const time = msg.substring(0, i1)
        const date = new Date(Date.parse(time))
        console.log(date)
        const hanDate = convertDate(date)
        const displayDate = diffHanDate(lastDate, date, hanDate)
        lastDate = date

        const nick = msg.substring(i1+3, i2)
        const displayNick = nicks[nick] || nick
        const text = msg.substring(i2 + 2)

        $('#chatlog').append('<span class="message ' + date.toISOString() + '"><span class="date">' + displayDate + '</span><span class="nick">' + displayNick + '</span><span class="said">曰</span><span class="text">' + text + '</span></span>')
    }

})
