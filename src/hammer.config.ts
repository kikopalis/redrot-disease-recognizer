import { Injectable } from '@angular/core';
import { HammerGestureConfig } from '@angular/platform-browser';

@Injectable()
export class MyHammerConfig extends HammerGestureConfig {
  override overrides = {
    pinch: { enable: true },
    rotate: { enable: true }
  };
}
