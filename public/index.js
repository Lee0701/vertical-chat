
window.addEventListener('load', () => {
    if(!channel) return

    const socket = io()

    socket.on('connect', () => {
        socket.emit('join', {nick, channel})
    })

    const double = channel.startsWith('##')
    const doublePrefix = double ? 'double/' : ''
    const channelName = channel.replace(/\#/g, '')
    $.ajax({
        url: '/logs/' + doublePrefix + channelName + '/',
        success: (data) => {
            $('#chatlog').append(data.toString())
        }
    })

    $('#write').submit((event) => {
        event.preventDefault()
        const text = $('#message').val()
        if(text.trim() != '') socket.emit('message', text)
        $('#message').val('')
    })

    socket.on('message', (msg) => {
        $('#chatlog').append(msg.toString())
    })

    socket.on('close', () => {
        location.reload()
    })

})
