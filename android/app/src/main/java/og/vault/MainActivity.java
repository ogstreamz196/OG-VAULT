package og.vault;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AdbBridgePlugin.class);
        super.onCreate(savedInstanceState);
        // The store scales itself to the screen in CSS; stop Fire OS / Android TV font-size
        // settings from zooming text on top of that and breaking the 10-foot layout.
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebSettings settings = getBridge().getWebView().getSettings();
            settings.setTextZoom(100);
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);
        }
    }
}
