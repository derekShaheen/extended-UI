const formattingUtil = require("extended-ui/utils/formatting");
const powerUI = require("extended-ui/ui/other/power-ui");

let diffs = {};
const historyTimeSpan = 1; // Time in seconds over which to average

let contentTable;
let coreItemsCell; // for v6
let coreItemsCollapser; // for v7
let oldCoreItemsTable;

let isReplaced = false;
let booted = false;

Events.on(ClientLoadEvent, () => {
    contentTable = new Table(Styles.black6);
    contentTable.pack();

    if (Version.number < 7) {
        const coreInfoTable = Vars.ui.hudGroup.find("coreitems");
        oldCoreItemsTable = coreInfoTable.getChildren().get(0);
        coreItemsCell = coreInfoTable.getCell(oldCoreItemsTable);
    } else {
        coreItemsCollapser = Vars.ui.hudGroup.find('coreinfo').getChildren().get(1).getChildren().get(0);
        oldCoreItemsTable = coreItemsCollapser.getChildren().get(0);
    }

    // Reset diffs when client loads to avoid data persisting between sessions
    diffs = {};

    Timer.schedule(update, 0, 3); // Check for UI replacement every 3 seconds
});

Events.on(WorldLoadEvent, () => {
    // Reset diffs when a new world is loaded to ensure clean data
    diffs = {};
});

Events.run(Trigger.update, () => {
    if (!isReplaced) return;
    rebuildTable();
});

function update() {
    if (Core.settings.getBool("eui-ShowResourceRate", false)) {
        if (!isReplaced || !booted) {
            const resourceTable = powerUI.createTableWithBarFrom(contentTable);
            isReplaced = true;
            booted = true;
            coreItemsCollapser.setTable(resourceTable);
        }
    } else {
        if (isReplaced || !booted) {
            const resourceTable = powerUI.createTableWithBarFrom(oldCoreItemsTable);
            isReplaced = false;
            booted = true;
            coreItemsCollapser.setTable(resourceTable);
        }
    }
}

function rebuildTable() {
    clearTable();
    buildTable();
}

function buildTable() {
    const resourcesTable = contentTable.table().get();
    const currentItems = Vars.player.team().items();
    let i = 0;
    currentItems.each((item, amount) => {
        if (!diffs[item]) {
            diffs[item] = { values: [], lastAmount: amount, lastTimestamp: Time.millis(), displayValue: 0 };
        }

        let diff = diffs[item];
        let currentTime = Time.millis();

        // Only push new amounts if there's a change
        if (diff.lastAmount !== amount) {
            diff.values.push({ time: currentTime, amount: amount });
            diff.lastAmount = amount;
        }

        // Calculate and update the display value only once per time span
        if (currentTime - diff.lastTimestamp >= 1000 * historyTimeSpan) {
            if (diff.values.length > 1) {
                let totalChange = 0;
                for (let j = 1; j < diff.values.length; j++) {
                    let previous = diff.values[j - 1];
                    let current = diff.values[j];
                    totalChange += current.amount - previous.amount;
                }
                diff.displayValue = totalChange / (diff.values.length - 1);
            } else {
                diff.displayValue = 0; // If no change or only one entry, assume no net change
            }
            diff.values = [{ time: currentTime, amount: amount }]; // Reset with the latest value
            diff.lastTimestamp = currentTime;
        }

        const difference = diff.displayValue;
        const color = difference >= 0 ? '[green]' : '[red]';
        const sign = difference >= 0 ? '+' : '';

        resourcesTable.image(item.uiIcon).left();
        resourcesTable.label(() => formattingUtil.numberToString(amount)).padLeft(2).left().padRight(1);
        resourcesTable.label(() => {
            // return "(" + color + sign + padNumber(Math.round(difference)) + "[white])";
            return "(" + color + sign + Math.round(difference) + "[white])";
        }).left().padRight(2);

        if (++i % 4 == 0) {
            resourcesTable.row();
        }
    });
    contentTable.row();
}

// function padNumber(num) {
//     let numStr = Math.abs(num).toString();
//     while (numStr.length < 2) {
//         numStr = '0' + numStr;
//     }
//     return numStr;
// }

function clearTable() {
    contentTable.clearChildren();
}
