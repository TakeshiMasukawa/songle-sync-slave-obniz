const obniz = new Obniz(window.secrets.obnizId);
const customDeviceName = "LINE Things Starter Obniz"
let notifyCharacteristic;

obniz.onconnect = async function () {
	obniz.display.clear();
	obniz.display.print("Obniz Ready");

	obniz.ble.security.setAuth(['bonding']);
	obniz.ble.security.setModeLevel(1, 2);

	obniz.ble.security.onerror = function () {
		console.error('security set params error');
		obniz.reboot();
	};
	var psdiCharacteristic = new obniz.ble.characteristic({
		"uuid": window.secrets.psdiCharacteristicUUID,
		"properties": ["read"],
		"text": sha256(obniz.id)
	});

	notifyCharacteristic = new obniz.ble.characteristic({
		"uuid": window.secrets.notifyCharacteristicUUID,
		"properties": ["notify"],
		"data": [0x00],
		"descriptors": [{
			"uuid": "2902",
			"data": [0x00, 0x00]
		}]
	});

	var writeCharacteristic = new obniz.ble.characteristic({
		"uuid": window.secrets.writeCharacteristicUUID,
		"properties": ["write"],
		"data": [0x00]
	});

	var psdiService = new obniz.ble.service({
		"uuid": window.secrets.psdiServiceUUID,
		"characteristics": [psdiCharacteristic]
	});
	obniz.ble.peripheral.addService(psdiService);

	var userService = new obniz.ble.service({
		"uuid": window.secrets.userServiceUUID,
		"characteristics": [notifyCharacteristic, writeCharacteristic]
	});
	obniz.ble.peripheral.addService(userService);

	obniz.ble.advertisement.setAdvData(userService.advData);
	obniz.ble.advertisement.setScanRespData({
		localName: customDeviceName
	});
	obniz.ble.advertisement.start();

	writeCharacteristic.onwritefromremote = function (address, newvalue) {
		if (newvalue[0] <= 1) {
			obniz.display.clear();
			newvalue[0] == 1 ? obniz.display.print("ON") : obniz.display.print("OFF");
		}
		console.log("remote address :", address);
		console.log("remote data :", newvalue);
	}

	obniz.switch.onchange = async function (state) {
		if (state === "push") {
			await notifyCharacteristic.writeTextWait(toAsciiArray("AB"));
			notifyCharacteristic.notify();
		}
	}
}

let player;

// APIの準備が出来ると呼ばれる
window.onSongleWidgetAPIReady = function (SongleWidgetAPI) {
	window.SW = SongleWidgetAPI;
	SW.System.defaultEndpointWebClientProtocol = "https:";
	init();
}

window.init = function () {
	player = new SW.Player();
	player.accessToken = window.secrets.accessToken;
	// slaveを同期させるプラグインを設定
	player.addPlugin(new SW.Plugin.SongleSync());
	// 利用するイベントのプラグインを設定
	player.addPlugin(new SW.Plugin.Chord({ offset: -2600 }));
	// 各イベントに対応するアクションを設定
	setChordEvent();
}

// コード左上に表示する
window.setChordEvent = function () {
	player.on("chordEnter", async function (e) {
		if (e.data.chord.name != "N") {
			$("#chord").text(e.data.chord.name);
			await notifyCharacteristic.writeTextWait(toAsciiArray(e.data.chord.name));
			notifyCharacteristic.notify();
		} else {
			$("#chord").text("");
		}
	});
}
// 文字列をASCIIの配列に変換
const toAsciiArray = (str) => {
	asciiKeys = [];
	for (var i = 0; i < str.length; i++) {
		asciiKeys.push(str[i].charCodeAt(0));
	}
	return asciiKeys
}