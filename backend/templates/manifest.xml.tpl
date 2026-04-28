<?xml version="1.0" encoding="UTF-8"?>
<iq:manifest version="3" xmlns:iq="http://www.garmin.com/xml/connectiq">
    <iq:application id="{{APP_ID}}" type="watchface" name="@Strings.AppName" entry="Main" launcherIcon="@Drawables.LauncherIcon" minSdkVersion="3.0.0">
        <iq:products>
            <iq:product id="{{DEVICE}}"/>
        </iq:products>
        <iq:permissions/>
        <iq:languages>
            <iq:language>eng</iq:language>
            <iq:language>ita</iq:language>
        </iq:languages>
    </iq:application>
</iq:manifest>
