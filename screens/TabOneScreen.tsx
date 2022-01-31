import { StyleSheet } from 'react-native';

import EditScreenInfo from '../components/EditScreenInfo';
import { Text, View } from '../components/Themed';
import { RootTabScreenProps } from '../types';
import { BleManager } from 'react-native-ble-plx';
import React from 'react';

export default class TabOneScreen extends React.Component<any,any> {
  manager: BleManager;
  constructor(props:any) {
    super(props);
    this.manager = new BleManager();
}

componentDidMount() {
  const subscription = this.manager.onStateChange((state) => {
    console.log(state);
    
      if (state === 'PoweredOn') {
          this.scanAndConnect();
          subscription.remove();
      }
  }, true);
}

scanAndConnect() {
  let ScanOptions ={
    allowDuplicates:false
  }
  this.manager.startDeviceScan(null, ScanOptions, (error, device) => {
      if (error) {
          // Handle error (scanning will be stopped automatically)
          return
      }
      
      if(device?.name?.includes('SK_')){
        console.log(device.isConnectable);
        this.manager.stopDeviceScan();
        setTimeout(() => {
          this.manager
            .connectToDevice(device.id?.toString(), {autoConnect: true})
            .then(device => {
              console.log('Discovering services and characteristics');
              console.log('device');
              return device.discoverAllServicesAndCharacteristics();
            })
            .then(device => {
              console.log('Listening... ');
              this.readData(device);
            })
            .catch(error => {
              this.manager
                .isDeviceConnected(device.id)
                .then(res => console.log(res))
                .catch(err => console.log(err));

                console.error(error.message);
              device.cancelConnection();
              this.scanAndConnect();
            });
        }, 1000);
      }
  });
}

async readData(device) {
  const services = await device.services();
  // const characteristics = [];
  services.forEach( ( service, i ) => {
    service.characteristics()
    .then( async (c) => {
          // characteristics.push( c );
          c.forEach( async( characteristics, i ) => {
          if ( i === services.length - 1 ) {
            console.log('characteristics: ', device.id, service.uuid, characteristics.uuid );
            await this.manager.readCharacteristicForDevice(device.id, service.uuid, characteristics.uuid)
            .then((res)=>{
              console.log(res);
              
            })
          }
        })
        })
  })
}

  render(): React.ReactNode {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Tab One</Text>
        <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
        <EditScreenInfo path="/screens/TabOneScreen.tsx" />
      </View>
    ); 
  }
  
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
