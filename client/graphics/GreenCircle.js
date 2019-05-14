import * as PIXI from 'pixi.js'
import HitpointBar from './HitpointBar'

class GreenCircle extends PIXI.Container {
    constructor(entity) {
        super()
        this._nid = entity.nid
        this.x = entity.x
        this.y = entity.y
        this.isAlive = entity.isAlive // not really used...

        this.hitpointBar = new HitpointBar()
        this.hitpointBar.x = -6
        this.hitpointBar.y = -20
        this.hitpointBar.setHitpointPercentage(entity._hitpoints/100)

        this._hitpoints = 0
        this.hitpoints = entity.hitpoints

        this.body = new PIXI.Graphics()
        this.body.beginFill(0xffffff)
        this.body.drawCircle(0, 0, 25)
        this.body.endFill()

        this.body.tint = 0x00ff00
    
        this.addChild(this.body)

        this.addChild(this.hitpointBar)

        this.text = new PIXI.Text(this.nid, {fontFamily : 'Arial', fontSize: 24, fill : 0xffffff, align : 'center'})

        this.addChild(this.text)
    }

    set hitpoints(value) {
        this._hitpoints = value
        this.hitpointBar.setHitpointPercentage(value/100)
    }

    set nid(value) {
        this._nid = value
        this.text.text = this._nid
    }
    get nid() {
        return this._nid
    }

    update(delta) {

    }
}

export default GreenCircle