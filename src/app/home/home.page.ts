import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ToastController, IonicModule } from '@ionic/angular';
import * as tf from '@tensorflow/tfjs';
import { TARGET_CLASSES } from './target_classes';
import {Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { ImageCropperComponent, ImageCroppedEvent, LoadedImage } from 'ngx-image-cropper';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


// const { Camera, Filesystem } = Plugins;

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ImageCropperComponent]

})
export class HomePage implements OnInit {
  hasValidImage = false;
  imgURL: string;
  croppedImage: any;
  clickedImage: string;
  
  imageChangedEvent: any;
  file: any = null;
  model: tf.LayersModel;
  
  @ViewChild("canvas") canvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('imagePreview') imagePreview: ElementRef<HTMLImageElement>;
  @ViewChild('inputFileElement', {static: true}) inputFileElement: ElementRef<HTMLInputElement>;
  @ViewChild('imageCropper') imageCropper: ImageCropperComponent;
  result: string = null;

  cropSize = {
    width: 250,
    height: 250
  };

  constructor(private toastService: ToastController) {}

  ngOnInit() {
    this.loadModel();
  }

  async captureImage() {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera
    });
    this.imgURL = image.webPath;
    this.hasValidImage = true;
  }

  // async cropImage() {
  //   const result = await this.imageCropper.crop();
  //   this.croppedImage = result.base64;
  // }

  cropImage(event: ImageCroppedEvent) {
    this.croppedImage = event.base64;
    this.classify(); // Call classify after cropping
  }

  async loadModel() {
    try {
          const model = await tf.loadLayersModel("/assets/model/model.json");
          this.model = model;
          this.toast("Model was loaded successfully");
        } catch (error) {
          console.log(error);
          this.toast("Error loading model");
        }
  }

  triggerInputFile() {
    this.inputFileElement.nativeElement.click();
  }
  
  triggerModel() {
    alert("this is a model woohoo");
  }

  async classify() {
    if (!this.model) {
      this.toast("No model loaded");
      return;
    }
    if (this.hasValidImage) {
      const tensor = tf.browser.fromPixels(this.canvas.nativeElement, 3)
        .resizeNearestNeighbor([224, 224]) // change the image size
        .toFloat()
        .expandDims()
        .div(255);

      const predictions = this.model.predict(tensor) as any;
      const d = await predictions.data() as number[];
      console.log("predictions: " + d);
      const top5 = Array.from(d)
        .map((p, i) => ({
          probability: p,
          className: TARGET_CLASSES[i]
        }))
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 5) as any[];
      console.log(top5);
      this.result = top5[0].className;
    } else {
      this.toast("Please select an image first.");
    }
  }

  setFile(event: Event) {
    const input = event.target as HTMLInputElement;
    this.hasValidImage = false;
    this.result = null;
    this.file = null;
    if (input.files.length > 0) {
      const file = input.files[0];
      this.file = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.previewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      this.imagePreview.nativeElement.src = '/assets/images/placeholder.jpg';
    }
  }
  
  previewImage(src: string) {
    this.imagePreview.nativeElement.src = src;
    this.hasValidImage = true;
    const newImg = new Image();
    newImg.onload = () => {
      const height = newImg.height;
      const width = newImg.width;
      const scale = 1.0 / 255;
      this.canvas.nativeElement.width = this.imagePreview.nativeElement.naturalWidth * scale;
      this.canvas.nativeElement.height = this.imagePreview.nativeElement.naturalHeight * scale;
      const context = this.canvas.nativeElement.getContext('2d');
      context.drawImage(this.imagePreview.nativeElement, 0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
      this.classify().then(() => {});
    };
    newImg.src = this.imagePreview.nativeElement.src;
  }

  toast(message: string) {
    this.toastService.create({
      message: message,
      duration: 3000
    }).then(toast => {
      toast.present();
    });
  }
}
