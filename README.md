# nengi-seams-prototype
A very messy prototype of server stitching/seams/grids/multi-instance. Players can see entities in real-time that are across the server boundary. This is accomplished via the instances using nengi bots to see each other's game state (a bot is like a client).

This current prototype creates two entirely separate game instances as if they were two different games. This is for development purposes so that defects can be intentionally created in one game instance at a time to see how it affects the other. A true version of a seam implementation would only have a single type of GameInstance which would be passed information about its area and its borders.

GameInstance1 is concerned with the area from 0,0 to 1000, 1000.  (The grid area)
 
GameInstance2 is concerned with the area from 1000,0 to 2000, 1000. (Black void to the right of the grid)

Technically both instances see *everything* about each other because they are both so small.

## Special Sauce
I'm publishing such a faulty prototype by demand -- so for those who wish to continue in line w/ the goals of this project, allow me to delineate the parts that I feel are on the correct path.

The first bit of magic is that each instance can see entities in its neighbor by connecting to it as if it were a game client itself. So players aren't the only "clients" here, the instances are clients of each other. The specific API that makes this possible is `nengi.Bot` b/c the bots were always a form of *client that ran in node.js*. The instances then take everything they see in each other and add it to themselves (replicating the state).
```js
const network = this.remoteViewer.bot.readNetwork()

network.entities.forEach(snapshot => {
    snapshot.createEntities.forEach(entity => {
        this.createRemoteEntity(entity)
    })

    snapshot.updateEntities.forEach(update => {
        this.updateRemoteEntity(update)
    })

    snapshot.deleteEntities.forEach(nid => {
        this.deleteRemoteEntity(nid)
    })
})
```
Just like in a normal game client, this consists of entity CRUD operations (create, update delete). There's one added gotcha which is that the entities already have a `nid` which is an identifier which only makes sense in the context of the instance which created that entity. So when an instance receives an entity from its neighbor, it stores the neighbor's `nid` as a `remoteId`, and then adds the entity to itself which ends up creating a new `nid`. In other words, the `remoteId` is the identifier from the remote instance, and the `nid` is the identifier used by the local instance.


```js
createRemoteEntity(entity) {
    // save the remote id, because we will be creating our own local id for it
    const remoteId = entity.nid

    if (entity.protocol.name === 'GreenCircle') {
        const remoteEntity = new GreenCircle(entity.x, entity.y)
        remoteEntity.remoteId = remoteId
        this.instance.addEntity(remoteEntity) // assigns a new nid
        this.remoteEnitites.set(remoteId, remoteEntity)
    }
    // etc
}
```
^the creation of the remote entity locally
The entity was added to `remoteEntities` just for the sake of record keeping, though it is non-essential. Flagging the entity with `entity.remote = true` or having later logic check for the pressence of `remoteId` would've been fine too. The important part is that this instance somehow has a way to know that this entity is a remote entity.

When performing raycasts to see if a shot hit an entity, the instance treats  local entities and remote entities differently. For local entities it is allowed to deal damage directly to them. For remote enitites it is required to ask the remote server to deal damage to the entity. Following this rule is how we can handle a myriad of would-be race condtions. The remote server can then figure out what to do safely.

```js
if (command.protocol.name === 'FireCommand') {
    if (entity.fire()) {

        this.entities.forEach(potentialVictim => {
            const hit = this.collisionSystem.checkLineCircle(entity.x, entity.y, command.x, command.y, potentialVictim.collider)
            // if the line intersects a player other than the shooter
            if (hit && potentialVictim.nid !== entity.nid) {
                /* LOCAL */
                potentialVictim.takeDamage(25)
            }
        })
        this.remoteEnitites.forEach(potentialVictim => {
            const hit = this.collisionSystem.checkLineCircle(entity.x, entity.y, command.x, command.y, potentialVictim.collider)
            // if the line intersects a player other than the shooter
            if (hit && potentialVictim.nid !== entity.nid) {
                /* REMOTE */
                this.remoteViewer.bot.addCommand(new RemoteDamage(potentialVictim.remoteId, 25))
            }
        })
    }
}
```
And then the other instance receives that `RemoteDamage` command:

```js
if (command.protocol.name === 'RemoteDamage') {
    // deals damage to its own entity
    // this checks that the entity still even exists (race condition averted)
    const ent = this.entities.get(command.nid)
    if (ent) {
        ent.takeDamage(command.amount)
    }
}
```

## Instance-remote-seam vs multi-connect-seam alternative
This experiment interconnects instances so that they may share game state in their border areas. It comes with the benefit that players are only ever connected to a single instance, and yet they can see entities from other instances. The performance characteristics of this are predictable - each instance is connected to each player and each neighbor. One can easily estimate/benchmark the cost of a neighbor or an entity. There is some mild concern if many players congregate at a border, but ultimately the two servers end up splitting the load which is great.

An alternative implemenation that I am working known as `client multi-connect` attempts to accomplish the same thing by having the game client connect to as many instances as it can see. So rather than have the instances replicate remote state, they stay isolated and *somewhat* oblivious of one another. Instead the game client, as it nears the border between two instances, simply connects to both instances and thus receives state on either side of the border. It also sends its commands to both instances and the entity it controls also exists on both instances while it is near the border. The big benefits of this design is that everything seems relatively easy to program -- there's none of this instances replicating state stuff anymore. There's even a chance that nengi could do most of the work implicitly. It also makes seeing across the seam trivial...the client just naturally sees across the seam. There is however a downside, which is that by being connected to two instances the client is consuming a greater amount of resources particularly at the seams. All large swarm of players could somewhat easily compromise multiple instances by congretating at a seam.

I'll be prototyping and benchmarking both of the above before formally advocating one model versus the other.

Also both models are incomplete around transfering entities across boundaries smoothly, but some hybrid of the two might do the trick.

## Misc

To run the game:
```sh
npm install
npm start
## visit http://localhost:8080
```


The renderer is PIXI v5

The controls are
- w - up
- a - left
- s - down
- d - right
- mousemove - look around
- mouseclick - shoot


## Bots
There are bots programmed to run around randomly in the game. To connect the bots keep the game running as done with `npm start` and then open an additional command prompt.

These bots do not implement the seam transfer - so they will vanish if they touch the seam.

```sh
> node bot/index.js
```
