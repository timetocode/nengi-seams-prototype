import nengi from 'nengi'
import nengiConfig from '../common/nengiConfig'


//const protocolMap = new nengi.ProtocolMap(nengiConfig, nengi.metaConfig)
//console.log('prots', protocolMap)
class RemoteViewer {
    constructor(address, prots) {
        this.bot = new nengi.Bot(nengiConfig, prots)

        this.bot.onConnect(response => {

            console.log('remote connection', response)
        })

        this.bot.onClose(() => {
            console.log('remote connection closed')
        })
        console.log('bot trying to connect...')
        this.bot.connect(address, { remoteViewerPassword: '12345' })
    }

    addCommand(command) {
        this.bot.addCommand(command)
    }

    update() {
        return
        if (this.bot.websocket) {
            const snapshots = this.bot.readNetwork()
            this.bot.update()
            return snapshots
        }
    }
}

export default RemoteViewer