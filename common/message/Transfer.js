import nengi from 'nengi'

class Transfer {
    constructor(address, x, y, json) {
        this.address = address
        this.x = x
        this.y = y
        this.json = json
    }
}

Transfer.protocol = {
    address: nengi.String,
    x: nengi.Int32,
    y: nengi.Int32,
    json: nengi.String
}

export default Transfer
