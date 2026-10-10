import { Audio } from "expo-av";

let soundInstance: Audio.Sound | null = null;

/**
 * Plays the incoming booking ringtone on loop until explicitly stopped.
 */
export const playIncomingRingtone = async (): Promise<void> => {
  try {
    // If sound is already playing, stop it first
    if (soundInstance) {
      await stopIncomingRingtone();
    }

    // Configure audio mode to ensure sound plays even if device is on silent (if OS permits)
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      staysActiveInBackground: true,
      playThroughEarpieceAndroid: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      require("@/assets/sounds/incoming_ride.mp3"),
      {
        shouldPlay: true,
        isLooping: true,
        volume: 1.0,
      }
    );

    soundInstance = sound;
  } catch (error) {
    console.error("❌ Error playing incoming booking ringtone:", error);
  }
};

/**
 * Stops and unloads the incoming booking ringtone.
 */
export const stopIncomingRingtone = async (): Promise<void> => {
  try {
    if (soundInstance) {
      const status = await soundInstance.getStatusAsync();
      if (status.isLoaded) {
        await soundInstance.stopAsync();
        await soundInstance.unloadAsync();
      }
      soundInstance = null;
    }
  } catch (error) {
    console.error("❌ Error stopping incoming booking ringtone:", error);
    soundInstance = null;
  }
};
