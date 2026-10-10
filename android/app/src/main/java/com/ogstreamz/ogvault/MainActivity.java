package com.ogstreamz.ogvault;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AdbBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
