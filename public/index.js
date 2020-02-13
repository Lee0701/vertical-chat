
window.addEventListener('load', () => {
    if(!channel) return

    const converter = window.index.NumberToChineseWords
    const socket = io()
    const nicks = {}

    socket.on('connect', () => {
        socket.emit('join', {nick, channel})
    })

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

    $('#write').submit((event) => {
        event.preventDefault()
        const text = $('#message').val()
        if(text.trim() != '') socket.emit('message', text)
        $('#message').val('')
    })

    socket.on('nick', (data) => {
        for(key in data) nicks[key] = data[key]
    })

    socket.on('message', (msg) => {
        appendMessage(msg)
    })

    socket.on('close', () => {
        location.reload()
    })

    const convertDate = (time) => {
        const date = new Date(Date.parse(time))
        const hours = converter.toWords(date.getHours())
        const minutes = converter.toWords(date.getMinutes())
        const seconds = converter.toWords(date.getSeconds())
        return hours + '時' + minutes + '分' + seconds + '秒'
    }

    const appendMessage = (msg) => {
        const i1 = msg.indexOf(' - ')
        const i2 = msg.indexOf(': ')

        const date = convertDate(msg.substring(0, i1))
        const nick = msg.substring(i1+3, i2)
        const displayNick = nicks[nick] || nick
        const text = msg.substring(i2 + 2)

        $('#chatlog').append('<span class="message"><span class="date">' + date + '</span> <span class="nick">' + displayNick + '</span> <span class="text">' + text + '</span></span> ')
    }

})
