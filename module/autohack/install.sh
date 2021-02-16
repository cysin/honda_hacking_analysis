#!/system/bin/sh

chmod 666 /data/data/whitelist-1.0.xml
cp whitelist_mitsubishi.xml /data/data/whitelist-1.0.xml
chown system:system /data/data/whitelist-1.0.xml
chmod 666 ./installer
pm install -r ./installer
pm clear com.android.browser
am start -n cn.autohack.hondahack/.MainActivity --ez rooted true --es key 0946993636
