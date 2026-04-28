using Toybox.Application;
using Toybox.WatchUi;
using Toybox.Graphics;
using Toybox.Time;
using Toybox.Time.Gregorian;
using Toybox.Math;
using Toybox.System;
using Toybox.ActivityMonitor;

class Main extends Application.AppBase {
    function initialize() {
        AppBase.initialize();
    }

    function getInitialView() {
        return [ new MainView() ];
    }
}

class MainView extends WatchUi.WatchFace {
    {{#HAS_PHOTO}}var _photo;{{/HAS_PHOTO}}
    var _logosquadra;
    var _lastRefreshSec = -1;

    function initialize() {
        WatchFace.initialize();
    }

    function onLayout(dc) {
        {{#HAS_PHOTO}}_photo = WatchUi.loadResource(Rez.Drawables.Photo);{{/HAS_PHOTO}}
        _logosquadra = WatchUi.loadResource(Rez.Drawables.LogoSquadra);
    }

    function onUpdate(dc) {
        var w = dc.getWidth();
        var h = dc.getHeight();
        var cx = w / 2;
        var cy = h / 2;

        drawBackground(dc);

        {{#SHOW_NUMBERS}}drawNumbers(dc, cx, cy);{{/SHOW_NUMBERS}}
        {{#SHOW_TICKS}}drawTicks(dc, cx, cy);{{/SHOW_TICKS}}
        {{#SHOW_HR}}drawHr(dc, {{HR_X}}, {{HR_Y}});{{/SHOW_HR}}
        {{#SHOW_BATTERY}}drawBattery(dc, {{BATTERY_X}}, {{BATTERY_Y}});{{/SHOW_BATTERY}}

        {{#MEMORIAL_LINE1}}drawTextWithShadow(dc, {{TEXT1_X}}, {{TEXT1_Y}}, Graphics.FONT_MEDIUM, "{{MEMORIAL_LINE1}}", Graphics.COLOR_WHITE);{{/MEMORIAL_LINE1}}
        {{#MEMORIAL_LINE2}}drawTextWithShadow(dc, {{TEXT2_X}}, {{TEXT2_Y}}, Graphics.FONT_SMALL, "{{MEMORIAL_LINE2}}", Graphics.COLOR_WHITE);{{/MEMORIAL_LINE2}}

        drawAllHands(dc, cx, cy);
    }

    function onPartialUpdate(dc) {
        var w = dc.getWidth();
        var h = dc.getHeight();
        var cx = w / 2;
        var cy = h / 2;

        // Aggiorna lancette ogni secondo
        var r = 120;
        dc.setClip(cx - r, cy - r, 2 * r, 2 * r);
        drawBackground(dc);
        {{#SHOW_NUMBERS}}drawNumbers(dc, cx, cy);{{/SHOW_NUMBERS}}
        {{#SHOW_TICKS}}drawTicks(dc, cx, cy);{{/SHOW_TICKS}}
        {{#MEMORIAL_LINE1}}drawTextWithShadow(dc, {{TEXT1_X}}, {{TEXT1_Y}}, Graphics.FONT_MEDIUM, "{{MEMORIAL_LINE1}}", Graphics.COLOR_WHITE);{{/MEMORIAL_LINE1}}
        {{#MEMORIAL_LINE2}}drawTextWithShadow(dc, {{TEXT2_X}}, {{TEXT2_Y}}, Graphics.FONT_SMALL, "{{MEMORIAL_LINE2}}", Graphics.COLOR_WHITE);{{/MEMORIAL_LINE2}}
        drawAllHands(dc, cx, cy);
        dc.clearClip();

        // FC e batteria ogni 3 secondi
        var sec = Gregorian.info(Time.now(), Time.FORMAT_MEDIUM).sec;
        if (sec != _lastRefreshSec && (sec % 3) == 0) {
            {{#SHOW_HR}}
            dc.setClip({{HR_X}} - 70, {{HR_Y}} - 15, 140, 30);
            drawBackground(dc);
            drawHr(dc, {{HR_X}}, {{HR_Y}});
            dc.clearClip();
            {{/SHOW_HR}}
            {{#SHOW_BATTERY}}
            dc.setClip({{BATTERY_X}} - 70, {{BATTERY_Y}} - 15, 140, 30);
            drawBackground(dc);
            drawBattery(dc, {{BATTERY_X}}, {{BATTERY_Y}});
            dc.clearClip();
            {{/SHOW_BATTERY}}
            _lastRefreshSec = sec;
        }
    }

    function drawBackground(dc) {
        {{#HAS_PHOTO}}
        dc.drawBitmap(0, 0, _photo);
        {{/HAS_PHOTO}}
        {{^HAS_PHOTO}}
        dc.setColor(Graphics.COLOR_{{BACKGROUND_COLOR}}, Graphics.COLOR_{{BACKGROUND_COLOR}});
        dc.clear();
        {{/HAS_PHOTO}}
        drawLogoSquadra(dc);
    }

    function drawLogoSquadra(dc) {
        var x = {{LOGO_X}} - 80;
        var y = {{LOGO_Y}};
        dc.drawBitmap(x, y, _logosquadra);
    }

    {{#SHOW_NUMBERS}}
    function drawNumbers(dc, cx, cy) {
        dc.setColor(Graphics.COLOR_{{ACCENT_COLOR}}, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, cy - 96, Graphics.FONT_SMALL, "12", Graphics.TEXT_JUSTIFY_CENTER);
        dc.drawText(cx + 94, cy - 9, Graphics.FONT_SMALL, "3", Graphics.TEXT_JUSTIFY_CENTER);
        dc.drawText(cx, cy + 72, Graphics.FONT_SMALL, "6", Graphics.TEXT_JUSTIFY_CENTER);
        dc.drawText(cx - 94, cy - 9, Graphics.FONT_SMALL, "9", Graphics.TEXT_JUSTIFY_CENTER);
    }
    {{/SHOW_NUMBERS}}

    {{#SHOW_TICKS}}
    function drawTicks(dc, cx, cy) {
        dc.setColor(Graphics.COLOR_{{ACCENT_COLOR}}, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(3);
        dc.drawLine(cx, cy - 122, cx, cy - 110);
        dc.drawLine(cx, cy + 110, cx, cy + 122);
        dc.drawLine(cx + 110, cy, cx + 122, cy);
        dc.drawLine(cx - 122, cy, cx - 110, cy);
        dc.setPenWidth(1);
    }
    {{/SHOW_TICKS}}

    {{#SHOW_HR}}
    function drawHr(dc, x, y) {
        var hrIter = ActivityMonitor.getHeartRateHistory(1, true);
        var hr = null;
        if (hrIter != null) {
            var s = hrIter.next();
            if (s != null && s.heartRate != ActivityMonitor.INVALID_HR_SAMPLE) {
                hr = s.heartRate;
            }
        }
        var txt = (hr == null) ? "--" : hr.toString();
        dc.setColor(Graphics.COLOR_RED, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, y, Graphics.FONT_SMALL, "\u2665 " + txt, Graphics.TEXT_JUSTIFY_CENTER);
    }
    {{/SHOW_HR}}

    {{#SHOW_BATTERY}}
    function drawBattery(dc, x, y) {
        var pct = System.getSystemStats().battery.toNumber();
        var color;
        if (pct <= 15) { color = Graphics.COLOR_RED; }
        else if (pct <= 35) { color = Graphics.COLOR_YELLOW; }
        else { color = Graphics.COLOR_GREEN; }
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, y, Graphics.FONT_SMALL, pct.toString() + "%", Graphics.TEXT_JUSTIFY_CENTER);
    }
    {{/SHOW_BATTERY}}

    function drawAllHands(dc, cx, cy) {
        var now  = Gregorian.info(Time.now(), Time.FORMAT_MEDIUM);
        var hour = now.hour % 12;
        var min  = now.min;

        var twoPi = 2 * Math.PI;
        var hourAngle = (hour + min / 60.0) * (twoPi / 12);
        var minAngle  = min * (twoPi / 60);

        drawHand(dc, cx, cy, hourAngle, 55, 6, Graphics.COLOR_{{ACCENT_COLOR}});
        drawHand(dc, cx, cy, minAngle,  95, 4, Graphics.COLOR_{{ACCENT_COLOR}});
        {{#SHOW_SECONDS}}
        var secAngle = now.sec * (twoPi / 60);
        drawHand(dc, cx, cy, secAngle, 105, 2, Graphics.COLOR_{{SECOND_HAND_COLOR}});
        {{/SHOW_SECONDS}}

        dc.setColor(Graphics.COLOR_{{ACCENT_COLOR}}, Graphics.COLOR_TRANSPARENT);
        dc.fillCircle(cx, cy, 6);
        dc.setColor(Graphics.COLOR_{{BACKGROUND_COLOR}}, Graphics.COLOR_TRANSPARENT);
        dc.fillCircle(cx, cy, 3);
    }

    function drawHand(dc, cx, cy, angle, length, width, color) {
        var endX = cx + length * Math.sin(angle);
        var endY = cy - length * Math.cos(angle);
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.setPenWidth(width);
        dc.drawLine(cx, cy, endX, endY);
        dc.setPenWidth(1);
    }

    {{#HAS_MEMORIAL}}
    function drawTextWithShadow(dc, x, y, font, text, color) {
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x - 1, y,     font, text, Graphics.TEXT_JUSTIFY_CENTER);
        dc.drawText(x + 1, y,     font, text, Graphics.TEXT_JUSTIFY_CENTER);
        dc.drawText(x,     y - 1, font, text, Graphics.TEXT_JUSTIFY_CENTER);
        dc.drawText(x,     y + 1, font, text, Graphics.TEXT_JUSTIFY_CENTER);
        dc.setColor(color, Graphics.COLOR_TRANSPARENT);
        dc.drawText(x, y, font, text, Graphics.TEXT_JUSTIFY_CENTER);
    }
    {{/HAS_MEMORIAL}}
}
