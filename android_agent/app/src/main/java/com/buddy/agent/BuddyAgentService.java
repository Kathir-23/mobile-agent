package com.buddy.agent;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class BuddyAgentService extends Service {
    private static final String TAG = "BuddyAgentService";
    private static final String CHANNEL_ID = "BuddyAgentChannel";
    private static final int NOTIF_ID = 1001;

    private String serverUrl = "https://suggestions-rates-nested-schools.trycloudflare.com/api/buddy/agent/heartbeat";
    private String deviceId;
    private Handler handler;
    private Runnable heartbeatRunnable;
    private boolean isRunning = false;

    @Override
    public void onCreate() {
        super.onCreate();
        deviceId = "android_" + Build.MODEL.replaceAll("\\s+", "_").toLowerCase();
        createNotificationChannel();
        try {
            startForeground(NOTIF_ID, buildNotification("Buddy Agent Connected"));
        } catch (Exception e) {
            Log.e(TAG, "Error starting foreground service", e);
        }

        handler = new Handler(Looper.getMainLooper());
        heartbeatRunnable = new Runnable() {
            @Override
            public void run() {
                if (isRunning) {
                    sendHeartbeat();
                    handler.postDelayed(this, 3000); // 3-second heartbeat
                }
            }
        };
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.hasExtra("server_url")) {
            serverUrl = intent.getStringExtra("server_url");
        }
        if (!isRunning) {
            isRunning = true;
            handler.post(heartbeatRunnable);
            Log.i(TAG, "Buddy Service Started on " + serverUrl);
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        isRunning = false;
        if (handler != null) handler.removeCallbacks(heartbeatRunnable);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private int getBatteryLevel() {
        try {
            IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = registerReceiver(null, ifilter);
            if (batteryStatus != null) {
                int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                if (level >= 0 && scale > 0) {
                    return Math.round((level / (float) scale) * 100);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error fetching battery", e);
        }
        return 75;
    }

    private void sendHeartbeat() {
        new Thread(() -> {
            try {
                URL url = new URL(serverUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(3000);
                conn.setReadTimeout(3000);

                JSONObject json = new JSONObject();
                json.put("device_id", deviceId);
                json.put("model", Build.MANUFACTURER + " " + Build.MODEL);
                json.put("battery", getBatteryLevel());
                json.put("platform", "Android " + Build.VERSION.RELEASE);

                OutputStream os = conn.getOutputStream();
                os.write(json.toString().getBytes("UTF-8"));
                os.close();

                int code = conn.getResponseCode();
                if (code == 200) {
                    BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) sb.append(line);
                    br.close();

                    JSONObject res = new JSONObject(sb.toString());
                    if (res.has("commands")) {
                        JSONArray cmds = res.getJSONArray("commands");
                        for (int i = 0; i < cmds.length(); i++) {
                            JSONObject cmd = cmds.getJSONObject(i);
                            executeCommand(cmd);
                        }
                    }
                }
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "Heartbeat failed: " + e.getMessage());
            }
        }).start();
    }

    private void executeCommand(JSONObject cmd) {
        try {
            String intentName = cmd.optString("intent", "").toUpperCase();
            String entity = cmd.optString("entity", "").toLowerCase();
            Log.i(TAG, "Executing Intent: " + intentName + " Entity: " + entity);

            handler.post(() -> {
                switch (intentName) {
                    case "RING_PHONE":
                        triggerBeaconAlarm();
                        break;
                    case "SET_VOLUME":
                        setMaxVolume();
                        break;
                    case "OPEN_APP":
                        launchApp(entity);
                        break;
                    case "LOCK_SCREEN":
                        lockOrSleep();
                        break;
                    case "WAKE_SCREEN":
                        wakeScreen();
                        break;
                    default:
                        Log.w(TAG, "Unknown intent: " + intentName);
                        break;
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error executing command", e);
        }
    }

    private void triggerBeaconAlarm() {
        wakeScreen();
        setMaxVolume();

        // Vibrator
        Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (v != null && v.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createWaveform(new long[]{0, 500, 200, 500, 200, 1000}, -1));
            } else {
                v.vibrate(2000);
            }
        }

        // Synth Sound Tone
        try {
            MediaPlayer mp = MediaPlayer.create(this, android.provider.Settings.System.DEFAULT_RINGTONE_URI);
            if (mp != null) {
                mp.setVolume(1.0f, 1.0f);
                mp.start();
            }
        } catch (Exception e) {
            Log.e(TAG, "Audio alarm failed", e);
        }
    }

    private void setMaxVolume() {
        AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (am != null) {
            int maxRing = am.getStreamMaxVolume(AudioManager.STREAM_RING);
            int maxMusic = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
            int maxAlarm = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);

            am.setStreamVolume(AudioManager.STREAM_RING, maxRing, 0);
            am.setStreamVolume(AudioManager.STREAM_MUSIC, maxMusic, 0);
            am.setStreamVolume(AudioManager.STREAM_ALARM, maxAlarm, 0);
            Log.i(TAG, "All Audio Streams set to 100% MAX");
        }
    }

    private void launchApp(String entity) {
        String pkg = "";
        if (entity.contains("youtube")) pkg = "com.google.android.youtube";
        else if (entity.contains("whatsapp")) pkg = "com.whatsapp";
        else if (entity.contains("chrome")) pkg = "com.android.chrome";
        else if (entity.contains("maps")) pkg = "com.google.android.apps.maps";

        if (!pkg.isEmpty()) {
            Intent i = getPackageManager().getLaunchIntentForPackage(pkg);
            if (i != null) {
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(i);
                return;
            }
        }
        // Fallback Intent
        Intent homeIntent = new Intent(Intent.ACTION_MAIN);
        homeIntent.addCategory(Intent.CATEGORY_HOME);
        homeIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(homeIntent);
    }

    private void wakeScreen() {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            PowerManager.WakeLock wl = pm.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "BuddyAgent:WakeLock"
            );
            wl.acquire(5000);
        }
    }

    private void lockOrSleep() {
        // Go home as screen lock fallback
        Intent home = new Intent(Intent.ACTION_MAIN);
        home.addCategory(Intent.CATEGORY_HOME);
        home.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(home);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel nc = new NotificationChannel(
                CHANNEL_ID,
                "Buddy Agent Service",
                NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(nc);
        }
    }

    private Notification buildNotification(String text) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Buddy AI Mobile Agent")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build();
    }
}
