import GameInstance from './GameInstance'
import nengiConfig from '../common/nengiConfig'
import minimist from 'minimist'
const argv = minimist(process.argv.slice(2))

const gameInstance = new GameInstance(argv)
//const gameInstance2 = new GameInstance({ port: 8078 })

const hrtimeMs = function () {
    let time = process.hrtime()
    return time[0] * 1000 + time[1] / 1000000
}

let tick = 0
let previous = hrtimeMs()
const tickLengthMs = 1000 / nengiConfig.UPDATE_RATE

const loop = function () {
    const now = hrtimeMs()
    if (previous + tickLengthMs <= now) {
        const delta = (now - previous) / 1000
        previous = now
        tick++

        // const start = hrtimeMs() // uncomment to benchmark
        gameInstance.update(delta, tick, Date.now())
        //gameInstance2.update(delta, tick, Date.now())
        // const stop = hrtimeMs()
        //console.log('game update took', stop-start, 'ms')
    }

    if (hrtimeMs() - previous < tickLengthMs - 4) {
        setTimeout(loop)
    } else {
        setImmediate(loop)
    }
}

loop()

