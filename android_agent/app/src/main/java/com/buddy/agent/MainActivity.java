package com.buddy.agent;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private EditText ipInput;
    private Button startBtn;
    private TextView statusText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Simple Layout Programmatically
        android.widget.LinearLayout layout = new android.widget.LinearLayout(this);
        layout.setOrientation(android.widget.LinearLayout.VERTICAL);
        layout.setPadding(60, 100, 60, 60);
        layout.setBackgroundColor(0xFF090D16);

        TextView title = new TextView(this);
        title.setText("🤖 Buddy Mobile Agent");
        title.setTextSize(24);
        title.setTextColor(0xFFFFFFFF);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        title.setGravity(android.view.Gravity.CENTER);

        TextView subtitle = new TextView(this);
        subtitle.setText("Native Companion App for Buddy AI");
        subtitle.setTextSize(14);
        subtitle.setTextColor(0xFF9CA3AF);
        subtitle.setGravity(android.view.Gravity.CENTER);
        subtitle.setPadding(0, 10, 0, 40);

        ipInput = new EditText(this);
        ipInput.setHint("https://suggestions-rates-nested-schools.trycloudflare.com/api/buddy/agent/heartbeat");
        ipInput.setText("https://suggestions-rates-nested-schools.trycloudflare.com/api/buddy/agent/heartbeat");
        ipInput.setTextColor(0xFFFFFFFF);
        ipInput.setHintTextColor(0xFF6B7280);
        ipInput.setBackgroundColor(0xFF131B2E);
        ipInput.setPadding(30, 30, 30, 30);

        startBtn = new Button(this);
        startBtn.setText("⚡ Start Agent Service");
        startBtn.setTextColor(0xFFFFFFFF);
        startBtn.setBackgroundColor(0xFF2563EB);
        startBtn.setPadding(20, 20, 20, 20);

        statusText = new TextView(this);
        statusText.setText("Status: Service Active");
        statusText.setTextColor(0xFF10B981);
        statusText.setGravity(android.view.Gravity.CENTER);
        statusText.setPadding(0, 30, 0, 0);

        layout.addView(title);
        layout.addView(subtitle);
        layout.addView(ipInput);
        layout.addView(startBtn);
        layout.addView(statusText);

        setContentView(layout);

        startBtn.setOnClickListener(v -> {
            String url = ipInput.getText().toString().trim();
            Intent serviceIntent = new Intent(MainActivity.this, BuddyAgentService.class);
            serviceIntent.putExtra("server_url", url);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
            Toast.makeText(MainActivity.this, "Buddy Agent Started!", Toast.LENGTH_SHORT).show();
            statusText.setText("Status: Active on " + url);
        });

        // Auto-start on activity open
        Intent autoIntent = new Intent(this, BuddyAgentService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(autoIntent);
        } else {
            startService(autoIntent);
        }
    }
}
