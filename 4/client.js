const socket = new WebSocket('wss://qwerty-server.astroide.repl.co/');
let id = null;
socket.addEventListener('message', function (event) {
    console.log('Message from server:', event.data);
  let p = document.createElement('p');
  p.innerText = 'ID: ' + (id = event.data);
  document.body.appendChild(p);
  addEventListener('keydown', e => {
    socket.send('D' + e.key)
  })
  addEventListener('keyup', e => {
    socket.send('U' + e.key)
  })
});
socket.addEventListener('open', function (event) {
    console.log('Hello Server!');
  socket.send('client');
});
console.log('quack')

// Listen for messages
