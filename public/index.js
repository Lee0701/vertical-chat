
window.addEventListener('load', () => {
    const socket = io()

    if(channel) {
        const double = channel.startsWith('##')
        const doublePrefix = double ? 'double/' : ''
        const channelName = channel.replace(/\#/g, '')
        $.ajax({
            url: '/logs/' + doublePrefix + channelName + '/',
            success: (data) => {
                $('#chatlog').append(data.toString())
            }
        })
    }

    $('#write').submit(() => {
        const text = $('#message').text('')
        if(text.trim() != '') socket.emit('message', text)
        return false
    })

})
