import React, { Component } from 'react';
import Web3 from 'web3';
import Identicon from 'identicon.js';
import './App.css';
import Decentragram from '../abis/Decentragram.json'
import Navbar from './Navbar'
import Main from './Main'

const ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' })


class App extends Component {

  async componentWillMount() {
    await this.loadWeb3()
    await this.loadBlockchainData()
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {
      window.alert('Non-Ethereum browser detected. You should consider trying Metamask!')
    }
  }

  async loadBlockchainData() {
    const web3 = window.web3
    // Load account
    const accounts = await web3.eth.getAccount()
    this.setState({ account: accounts[0] })
    // Network ID
    const networkId = await web3.eth.net.getId()
    const networkData = Decentragram.networks[networkId]
    if(networkData) {
      const decetragram = web3.eth.Contract(Decentragram.abi, networkData.address)
      this.setState({ decentragram})
      const imageCount = await decentragram.methods.imageCount().call()
      this.setState({ imageCount })
      // Load images
      for (var i = 1; i<=imageCount; i++) {
        const image = await decentragram.methods.images(i).call()
        this.setState({
          images: [...this.state.images, image]
        })
      }

      // Sort images. Show highest tipped images first
      this.setState({
        images: this.state.images.sort((a,b) => b.tipAmount - a.tipAmount )
      })

      this.setState({ loading: false})
    } else {
      window.alert('Decentragram contract not deployed to detected network')
    }
  }

  captureFile = event => {
    event.preventDefault()
    // Process file for IPFS...
    const file = event.target.files[0]
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(file)

    reader.onloadend = () => {
      this.setState({buffer: Buffer(reader.result)})
      console.log('buffer', this.state.buffer)
    }
  }

  uploadImgae = description => {
    console.log("Submitting file to IPFS...")
    // Add file to IPFS...
    ipfs.add(this.state.buffer, (error, result) => {
      console.log('IPFS result', result)
      if(error) {
        console.error(error)
        return
      }
      
      this.setState({ loading: true })
      this.state.decentragram.methods.uploadImage(result[0].hash, description).send({ from: this.state.account }).on('transactionHash', (hash) => {
        this.setState({ loading: false })
      })
    })
  }

  tipImageOwner = (id, tipAmount) => {
    this.setState({ loading: true })
    this.state.decentragram.methods.tipImageOwner(id).send({ from: this.state.account, value: tipAmount }).on('transactionHash', (hash) => {
      this.setState({ loading: false })
    })
  }

  constructor(props) {
    super(props)
    this.state = {
      account: '',
      decentragram: null,
      images: [],
      loading: true
    }
  }

  render() {
    return (
      <div>
        <Navbar account={this.state.account} />
        { this.state.loading
          ? <div id="loader" className="text-center mt-5"><p>Loading...</p></div>
          : <Main
              images={this.state.images}
              captureFile={this.captureFile}
              uploadImage={this.uploadImgae}
              tipImageOwner={this.tipImageOwner}
            />
          }
      </div>
    );
  }
}

export default App;