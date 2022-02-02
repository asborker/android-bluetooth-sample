import { Button, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import React, { Component } from 'react';
import EditScreenInfo from '../components/EditScreenInfo';
import { Text, View } from '../components/Themed';
import { RootTabScreenProps } from '../types';
import { BleManager } from 'react-native-ble-plx';
import Espressif, {
  ESPDeviceState,
  ESPSecurityType,
  ESPTransportType,
  ESPEventState
} from "react-native-espressif";
import Device from './ble-components/Device';
import Logger from './ble-components/Logger';
import ESPConfig from '../constants/ble-config';
import CredentialsModal from './CredentialsModal';

export default class TabOneScreen extends React.Component<any,any> {
  // manager: BleManager;
  // loggerRef: React.RefObject<unknown>;
  espressif;
  loggerRef: any;

  constructor(props:any) {
    super(props);
    // this.manager = new BleManager();
    this.loggerRef = React.createRef();
    this.state = {
      status: "Initializing",
      devices: [],
      displayCredentialsModal: false,
      selectedDevice: null
    };
    
    this.espressif = new Espressif();
    console.log(new this.espressif.scanDevices());
    
    this.scanDevices = this.scanDevices.bind(this);
    this.load = this.load.bind(this);
    this.deviceStatusChanged = this.deviceStatusChanged.bind(this);
}
componentDidMount() {
  console.log("====== did mount ============");
  
  this.props.navigation.addListener("willFocus", this.load());
}
async deviceStatusChanged(device) {
  console.log("=======on device state change++++++++++++++");
  
  const { devices } = this.state;

  let index = devices.findIndex(temp => temp.uuid === device.uuid);
  devices[index] = device;

  this.loggerRef.addLine(
    `Device status changed ${device ? JSON.stringify(device, null, 2) : null}`
  );

  switch (device.state) {
    case ESPDeviceState.Configured:
      this.loggerRef.addLine("Start session");
      await device.startSession();
      break;
    case ESPDeviceState.SessionEstablished:
      this.loggerRef.addLine("Session established");
      this.setState({ selectedDevice: device });
    default:
      break;
  }

  this.setState({ devices: [...devices] });
}

async load() {
  try {
    console.log("+++++on load ++++++++++");
    
    await new this.espressif.setConfig(ESPConfig.get());

    this.loggerRef.addLine(
      `RNEspressif is starting with ${JSON.stringify(
        ESPConfig.get(),
        null,
        2
      )}`
    );
        console.log(">>>>>>>. before OnStateChanged <<<<<<<<<<<<");
  
    this.espressif.OnStateChanged = (state, devices) => {
      console.log("===========devices",devices);
      
      this.loggerRef.addLine(`STATE [${state}]`);
      this.setState({ devices });

      devices.forEach(device => {
        if (!device.onStatusChanged) {
          device.onStatusChanged = this.deviceStatusChanged(device);
        }
      });
    };

    this.setState({ status: "Ready" });

    this.loggerRef.addLine("RNEspressif is configured");
  } catch (e) {
    console.error(e);
    this.setState({ status: "Error" });
  }
}

scanDevices() {
  let x = new this.espressif.scanDevices();
  console.log(x);
  
  this.loggerRef.addLine("Start scanning devices");
  // this.load()
}
render() {
  const {
    status,
    devices = [],
    displayCredentialsModal,
    selectedDevice
  } = this.state;

  return (
    <View style={styles.container}>
      <CredentialsModal
        isVisible={displayCredentialsModal}
        onCancel={() => {
          this.setState({ displayCredentialsModal: false });
        }}
        onSubmit={async (ssid, passphrase) => {
          try {
            this.setState({ displayCredentialsModal: false });

            await selectedDevice.setCredentials(ssid, passphrase);

            this.loggerRef.addLine(`Credentials successfully changed`);
          } catch (e) {
            console.info(e);
            this.loggerRef.addLine(e);
          }
        }}
      />
      <Text style={styles.welcome}>Espressif example</Text>
      <Text style={styles.instructions}>STATUS: {status}</Text>

      <View style={{ alignItems: "center" }}>
        <TouchableOpacity onPress={this.scanDevices}>
          <Text style={styles.scanDevices}>Scan devices</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {(devices || []).map(device => (
          <Device
            key={device.uuid}
            device={device}
            connectTo={() => {
              this.loggerRef.addLine(`Connect to ${device.uuid}`);
              device.connect();
            }}
            setCredentials={() => {
              this.setState({ displayCredentialsModal: true });
            }}
            getDeviceInfo={async () => {
              try {
                this.loggerRef.addLine("GET DEVICE INFO");
                const data = await new this.espressif.getDeviceInfo();
                this.loggerRef.addLine(
                  `Get device info ${JSON.stringify(
                    JSON.parse(data),
                    null,
                    2
                  )}`
                );
              } catch (e) {
                console.error(e);
                this.loggerRef.addLine(`ERROR ${JSON.stringify(e, null, 2)}`);
              }
            }}
            scanWifi={async () => {
              try {
                const wifis = await device.scanWifi();

                this.loggerRef.addLine(
                  `Scan wifi finished ${JSON.stringify(
                    JSON.parse(wifis),
                    null,
                    2
                  )}`
                );
              } catch (e) {
                console.info(e);
                // this.loggerRef.addLine(`ERROR ${JSON.stringify(e, null, 2)}`);
              }
            }}
          />
        ))}
      </ScrollView>
      <Logger onRef={(ref: any) => (this.loggerRef = ref)} />
    </View>
  );
}
}

const styles = StyleSheet.create({
container: {
  flex: 1,
  justifyContent: "center",
  alignItems: "stretch",
  backgroundColor: "#F5FCFF"
},
welcome: {
  fontSize: 20,
  textAlign: "center",
  margin: 10
},
instructions: {
  textAlign: "center",
  color: "#333333",
  marginBottom: 5
},
scanDevices: {
  backgroundColor: "#00A86B",
  fontSize: 18,
  fontWeight: "100",
  padding: 20,
  borderRadius: 8,
  overflow: "hidden"
},
list: {
  flex: 1,
  marginTop: 20
}
});



///// BLE manager code below
// componentDidMount() {
//   const subscription = this.manager.onStateChange((state) => {
//     console.log(state);
    
//       if (state === 'PoweredOn') {
//           this.scanAndConnect();
//           subscription.remove();
//       }
//   }, true);
// }

// scanAndConnect() {
//   let ScanOptions ={
//     allowDuplicates:false
//   }
//   this.manager.startDeviceScan(null, ScanOptions, (error, device) => {
//       if (error) {
//           // Handle error (scanning will be stopped automatically)
//           return
//       }
      
//       if(device?.name?.includes('SK_')){
//         console.log(device.isConnectable);
//         this.manager.stopDeviceScan();
//         setTimeout(() => {
//           Espressif.scanDevices()
//           this.manager
//             .connectToDevice(device.id?.toString(), {autoConnect: true})
//             .then(device => {
//               console.log('Discovering services and characteristics');
//               console.log('device');
//               return device.discoverAllServicesAndCharacteristics();
//             })
//             .then(device => {
//               console.log('Listening... ');
//               this.readData(device);
//             })
//             .catch(error => {
//               this.manager
//                 .isDeviceConnected(device.id)
//                 .then(res => console.log(res))
//                 .catch(err => console.log(err));

//                 console.error(error.message);
//               device.cancelConnection();
//               this.scanAndConnect();
//             });
//         }, 1000);
//       }
//   });
// }

// async readData(device) {
//   const services = await device.services();
//   // const characteristics = [];
//   services.forEach( ( service, i ) => {
//     service.characteristics()
//     .then( async (c) => {
//           // characteristics.push( c );
//           c.forEach( async( characteristics, i ) => {
//           if ( i === services.length - 1 ) {
//             console.log('characteristics: ', device.id, service.uuid, characteristics.uuid );
//             await this.manager.readCharacteristicForDevice(device.id, service.uuid, characteristics.uuid)
//             .then((res)=>{
//               console.log(res);
              
//             })
//           }
//         })
//         })
//   })
// }

//   render(): React.ReactNode {
//     return (
//       <View style={styles.container}>
//         <Text style={styles.title}>Tab One</Text>
//         <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
//         <EditScreenInfo path="/screens/TabOneScreen.tsx" />
//       </View>
//     ); 
//   }
  
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: 'bold',
//   },
//   separator: {
//     marginVertical: 30,
//     height: 1,
//     width: '80%',
//   },
// });
