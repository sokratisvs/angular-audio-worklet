import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'audio-worklet';

  private audioSource: MediaStreamAudioSourceNode;
  private audioAnalyser?: AnalyserNode;
  private audioworkletNode: AudioWorkletNode;

  static average(arr: Uint8Array): number {
    return arr.reduce((prev, current) => prev + current, 0) / arr.length;
  }

  recordAudio() {
    navigator.mediaDevices.getUserMedia({audio: true})
      .then((stream) => {
        const audioContext = this.createAudioContext(stream);
        let audioNode;

        this.initializeWorklet(audioContext)
          .then((node) => {
            audioNode = node;
            this.audioSource.connect(audioNode);
            audioNode.connect(audioContext.destination);
          });
      })
      .catch((error) => console.log('error', error));
  }

  private async initializeWorklet(audioContext: AudioContext): Promise<AudioWorkletNode> {
    const workletFileName = require('file-loader!./worklet/worklet-processor.js');
    return await audioContext.audioWorklet.addModule(workletFileName).then(() => {
      this.audioworkletNode = new AudioWorkletNode(audioContext, 'worklet-processor');
      this.audioworkletNode.port.onmessage = (event) => {
        const bar = document.getElementById('bar');
        bar.style.width = AppComponent.average(event.data.inputBuffer) * 1000 + 'px';
      };
      return Promise.resolve(this.audioworkletNode);
    });
  }

  stopRecording(): void {
    this.audioSource.disconnect();
    this.audioworkletNode.port.close();
  }

  private createAudioContext(stream: MediaStream): AudioContext | undefined {
    const audioContext = new ((<any> window).AudioContext || (<any> window).webkitAudioContext)() as AudioContext;
    this.audioSource = audioContext.createMediaStreamSource(stream);
    this.audioAnalyser = audioContext.createAnalyser();
    this.audioSource.connect(this.audioAnalyser);
    this.audioSource.connect(audioContext.destination);
    return audioContext;
  }

}
