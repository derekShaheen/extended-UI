exports.debug = function(text) {
    let properties = {showTime: 10};
    exports.addInQueue(() => (Vars.ui.announce(text, 10)), properties);
}

exports.ingameAlert = function(text, repetitions) {
    let properties = {
        showTime: 5,
        repetitions: repetitions,
        delayer() {
            return !Vars.ui.hudfrag.shown;
        },
    };
    exports.addInQueue(() => showToast(Icon.warning, text), properties);
}

exports.addInQueue = function(sender, properties) {
    const queueItem = new QueueItem(sender, properties)

    let repetitions = queueItem.repetitions;
    if (repetitions) {
        let itemRepeats = repeats[queueItem.name]; 

        if (!itemRepeats) {
            repeats[queueItem.name] = 1;
        } else if (itemRepeats >= repetitions) {
            return;
        } else {
            repeats[queueItem.name] += 1;
        }
    }

    let size = queue.push(queueItem);
    if (size > maxQueueSize) queue.shift();
}

Events.run(Trigger.update, () => {
    let item = QueuePop();
    if (item) {
        item.sender();
    }
})

const maxQueueSize = 50;
let nextTime = Date.now() + 10000;
let id = 0;
let queue = [];
let repeats = {};

function QueueItem(sender, properties) {
    this.id = ++id;
    this.sender = sender;
    if (!properties) properties = {};
    
    this.delayer = properties.delayer || (() => false);
    this.name = properties.name || null;
    this.repetitions = properties.properties || 0;
    this.showTime = properties.showTime || 0;
}

function QueuePop() {
    if (nextTime > Date.now() || queue.length == 0) return;
    
    let item = queue.shift();

    if (item.delayer()) {
        queue.push(item);
        nextTime = Date.now() + 1000;
        return;
    }

    nextTime = Date.now() + item.showTime*1000;
    return item;
}

// copied from https://github.com/QmelZ/hackustry/blob/master/scripts/libs/toast.js
function showToast(icon, text){    
    if(!icon || !text) return;
    
    let table = new Table(Tex.button);
    table.update(() => {
        if(!Vars.ui.hudfrag.shown) table.remove();
    });
    table.margin(12);
    table.image(icon).pad(3);
    table.add(text).wrap().width(280).get().setAlignment(Align.center, Align.center);
    table.pack();
    
    let container = Core.scene.table();
    Vars.state.isMenu() ? container.top().right().add(table) : container.top().add(table);
    container.setTranslation(0, table.getPrefHeight());
    container.actions(
        Actions.translateBy(0, -table.getPrefHeight(), 1, Interp.fade),
        Actions.delay(2.5),
        Actions.run(() => container.actions(
            Actions.translateBy(0, table.getPrefHeight(), 1, Interp.fade),
            Actions.remove()
        ))
    );
}
