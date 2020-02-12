
window.addEventListener('load', () => {
    const socket = io()

    const changeNick = (nick) => socket.emit('nick.change', {nick})
    const sendMessage = (message) => socket.emit('chat.message', {message})

    const writeForm = document.querySelector('#write')
    const nickInput = document.querySelector('#nick')
    const messageInput = document.querySelector('#message')
    const sendButton = document.querySelector('#send')

    nickInput.value = ''

    write.addEventListener('submit', (event) => {
        event.preventDefault()
        if(messageInput.value.trim() == '') return
        sendMessage(messageInput.value)
        messageInput.value = ''
    })

    nickInput.addEventListener('change', () => {
        changeNick(nickInput.value)
    })

    const chatlog = document.querySelector('#chatlog')
    
    const appendLog = (text) => {
        const span = document.createElement('span')
        span.innerHTML = text
        chatlog.appendChild(span)
    }

    socket.on('chat.message', (data) => {
        appendLog(`<span class="nick">${data.nick}</span>曰${data.message}`)
    })

    socket.on('nick.update', (data) => {
        if(data.old === null) appendLog(`<span class="nick">${data.nick}</span>新參`)
        else appendLog(`<span class="old nick">${data.old}</span>易名以<span class="nick">${data.nick}</span>`)
    })

    socket.on('nick.change.deny', (data) => {
        nickInput.value = ''
    })

})
