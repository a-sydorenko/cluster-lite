#Description

* automatically raises child processes and hangs all the necessary handlers
* handles workers `on('exit')`
* broadcast messages sent by one child process for each running
* has marker, `[this.state]` which means that all processes work
* emit event each time the property `[this.state]` changes its value

#Run example


```javascript
const Cluster = require('cluster-lite')

const options = {
  structure: [
    {
      filename: 'tmp/app1.js',
      number: 3,
      sendPid: true, // send cluster's (not system!!!) process id to child process
      startMessage: true, // send message to child process
      message: { filename: 'app1.js' }
    },
    {
      filename: 'tmp/app1.js',
      number: 8,
      sendPid: true,
      startMessage: true,
      message: { filename: 'app1.js' }
    }
  ],
  // now you can define behavior of fallen worker 
  // through Map object with params for each exitCode
  
  instructions: new Map([
    [1, {
      type: '_timeout', args: [3000]
    }],
    [2, { type: '_exit' }]
  ]),
  timeoutOffset: 300
}

const cluster = new Cluster(options)

```

* TO RECEIVE MESSAGE JUST SUBSCRIBE ON MESSAGE FROM CHILD PROCESS

```javascript
process.on('message', (message) => {
  
  if (message.pid) {
    // this is cluster's pid
  }
  
  // else - your start message
})
```