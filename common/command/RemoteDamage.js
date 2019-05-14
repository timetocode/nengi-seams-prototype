import nengi from 'nengi'

class RemoteDamage {
    constructor(nid, amount) {
        this.nid = nid
        this.amount = amount
    }
}

RemoteDamage.protocol = {
    nid: nengi.UInt16,
    amount: nengi.Int32
}

export default RemoteDamage
