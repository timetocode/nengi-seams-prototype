import nengi from 'nengi'

import PlayerCharacter from './entity/PlayerCharacter'
import GreenCircle from './entity/GreenCircle'
import Identity from './message/Identity'
import WeaponFired from './message/WeaponFired'
import MoveCommand from './command/MoveCommand'
import FireCommand from './command/FireCommand'

import RemoteDamage from './command/RemoteDamage'
import Transfer from './message/Transfer'

const config = {
    UPDATE_RATE: 20, 

    ID_BINARY_TYPE: nengi.UInt16,
    TYPE_BINARY_TYPE: nengi.UInt8, 

    ID_PROPERTY_NAME: 'nid',
    TYPE_PROPERTY_NAME: 'ntype', 

    USE_HISTORIAN: false,
    HISTORIAN_TICKS: 0,

    protocols: {
        entities: [
            ['PlayerCharacter', PlayerCharacter],
            ['GreenCircle', GreenCircle]
        ],

        localMessages: [],
        messages: [
            ['Identity', Identity],
            ['WeaponFired', WeaponFired],

            /* remote */
            ['Transfer', Transfer]

   
        ],
        commands: [
            ['MoveCommand', MoveCommand],
            ['FireCommand', FireCommand],

            /* remote */
            ['RemoteDamage', RemoteDamage]
        ],
        basics: []
    }
}

export default config