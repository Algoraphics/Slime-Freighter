# Slime Freighter

**What is this?**

This is a music video style VR experience made with [A-Frame](https://aframe.io). 
Currently it is not supported on mobile devices.

**Credits**
- Music: *Side of the Road* by [@BigBlackDelta](https://twitter.com/bigblackdelta)
- Programming, Direction, and Asset Design (except lamp from Google Poly) by Ethan Rabb

**Questions? Comments? Bugs? Job Offers? Cool Links? Angry Rants?**
- Email:  *algoraphics@gmail.com*
- Twitter:  [@algoraphics](https://twitter.com/algoraphics)

**How to use** (Sorry for non-trivial instructions, it's a new platform)

*VR:*
1. Have Firefox 10, or another browser which [supports A-Frame VR.](https://aframe.io/docs/0.7.0/introduction/vr-headsets-and-webvr-browsers.html)
2. *Make sure your VR supported browser is closed.* Not always necessary, but helps to prevent issues.
3. Start your VR headset (Boot up SteamVR, open Oculus Home, etc)
4. Open WebVR supported browser and load up [Slime-Freighter](https://horse-machine.glitch.me/).
5. Hit the button in the bottom-right corner to enter VR. Put on your headset.
6. Hold the center cursor over the start button.

*2D:*
1. Open a browser which [supports A-Frame.](https://aframe.io/docs/0.7.0/introduction/vr-headsets-and-webvr-browsers.html#which-browsers-does-a-frame-support)
2. Load up [Slime-Freighter](https://horse-machine.glitch.me/).
3. Follow on-screen instructions. If you have a mouse, click the screen to lock your mouse to the "VR cursor"(gray circle). This is the same cursor VR users will control.
4. Hold the VR cursor over the start button.

**Troubleshooting/FAQ:**

- Refreshing the page will fix many problems:
  - Buttons out of place/missing, not responding to click/touch/hover, etc.
  - Seems like not everything has loaded (sky is white, main menu is missing, etc.)
  - The "Click to use VR cursor" prompt showing up in VR
- The screen is just...white.
  - If you're on a tablet/mobile phone, this is probably a good thing. This takes a bit longer to load on mobile devices, so give it a minute.
  - If it still hasn't loaded, make sure your browser [supports A-Frame.](https://aframe.io/docs/0.7.0/introduction/vr-headsets-and-webvr-browsers.html#which-browsers-does-a-frame-support)
- Are those cones on the side of the road supposed to be streetlights?
  - If the streetlights aren't loading, [clearing your browser cache](http://www.refreshyourcache.com/en/home/) might help.
- Vive issues:
  - Cannot start SteamVR (app running):
    - Find your browser and call end process on it. Restart SteamVR.
    - If unsuccessful, close browsers and restart Steam.
    - Open browsers only after SteamVR has started up again.
  - Loading forever (from within VR, even if display shows up on desktop):
    - Refresh page and try again.
    - If this does not work, close browser window, reboot SteamVR, and re-open window.
- Performance:
  - Displaying the webpage on both your VR headset and desktop will hurt performance. Minimize the window on desktop or open another random tab instead.

**Where can it run?**

Theoretically, it should work on Rift, Windows MR, etc, as long as you follow [A-Frame conventions for getting WebVR to run.](https://aframe.io/docs/0.7.0/introduction/vr-headsets-and-webvr-browsers.html)

List of devices on which this is confirmed to work:
- Vive running with Firefox 10 on Windows 10
- Google Chrome on Windows 10
- Google Chrome on Ubuntu
- Google Chrome on iOS
- Safari on iOS
- Firefox 10 on Windows 10

**Future Work:**
- Would like to add controller support, interactivity with elements
  - Allow users to affect color or motion of worlds using controller/cursor?
- Add "Infinite" mode to worlds
