/********************************************************************
 *  editor.js: Simple source-code editor in Javascript.
 *  Copyright 2005, Arijit De.
 *
 *  Distributed under: GNU General Public License v2 or later.
 *  Parts of this software have been adopted from Helene, a syntax
 *  highlighting text editor, by Muze (http://helene.muze.nl/).
 ********************************************************************/

// Key bindings
keys = new Array();

keys["9"] = do_tab;
//keys["40"] = do_down;
//keys["38"] = do_up;
//keys["13"] = do_return;
keys["c40"] = do_ctrlDown;
keys["c38"] = do_ctrlUp;
//keys["c37"] = do_ctrlLeft;
//keys["c39"] = do_ctrlRight;
keys["119"] = do_compile;
keys["113"] = do_save;

// Global vars
var cancelKey = false;
var editArea;
var editStatus;
var indentLevels = new Array();
var lineOffsets = new Array();
var charLine = new Array();
var numLines;
var dirty = true;
var ieCursorOffset;
var autosaveInterval = 60*5;   // in seconds
var autosaveClock;
var showShortcuts = false;
var saveReq;
var discardReq;
var checkReq;
var checkInterval = 600;
var customFocussed = false;

// add initEditor to global init list
addInit(initEditor);
addInit(saveDraft);

function initEditor() {
	editArea = document.submitForm.source;
	editStatus = getObj('edit_status');
	
	if (navigator.appName.indexOf("Internet") != -1) {
		document.onkeydown = handleKey;
	} else {
		document.onkeypress = handleKey;
	}
		
	if (!window.getSelection) {
		// find cursor start offset for IE
	}
	
	/*editArea.focus();
	setCursorPos(0);
	cursorLine = 0;
	indentLevels[0] = 0;*/
	
	// Load settings
	var editorHeight = readCookie('editorHeight');
	if (editorHeight != null) editArea.rows = editorHeight;
	
	var testMode = readCookie('testMode');
	if (testMode == 'custom') handleTestButton();
	
	document.submitForm.custom.onfocus = handleCustomFocus;
	document.submitForm.custom.onblur = handleCustomBlur;
}

function handleCustomFocus() {
	customFocussed = true;
}

function handleCustomBlur() {
	customFocussed = false;
}

function storeCaret() {
	if (!window.getSelection) {
		if (editArea.createTextRange)
			editArea.caretPos = document.selection.createRange().duplicate();
		else
			alert("Unsupported browser");
	}
}

function handleKey(evt) {
	evt = evt ? evt : (window.event ? window.event : null);
	if (evt) {
		//var code = (evt.charCode ? evt.charCode : ((evt.keyCode) ? evt.keyCode : evt.which));
		var code = evt.keyCode;
		
		if (evt.shiftKey) code = 's' + code;
		if (evt.altKey) code = 'a' + code;
		if (evt.ctrlKey) code = 'c' + code;
		
		var result;
		if (keys[code]) {
			result = keys[code]();
			cancelKey = !result;
			return result;
		} else {
			return true;
		}
	}
}

function filterKey(evt) {
	if (cancelKey) {
		cancelKey = false;
		return false;
	}
}

function do_tab() {
	if (document.selection) {
		var mtext = document.selection.createRange();
		mtext.text = "\t";
	} else if (window.getSelection) {
		var i = getCursorPos();
		var contents = editArea.value;
		editArea.value = contents.substring(0, i) + "\t" + contents.substring(i);
		setCursorPos(i+1);
	} else {
		// unsupported browser
		return true;
	}
	return false;
}

function calculateIndentLevel(pos) {
	var contents = editArea.value;
	var i;
	var count=0;
	for (i=pos-1; i>=0 && contents.charAt(i) != "\n"; --i) {
		if (contents.charAt(i) == "\t") {
			count++;
		} else {
			count=0;
		}
	}
	return count;
}

function do_return() {
	if (window.getSelection) { // mozilla!
		if (customFocussed == true) return true;
	
		var pos = getCursorPos();
		var contents = editArea.value;
		
		var level = calculateIndentLevel(pos);
		var i;
		var insert = "\n";
		for (i=0; i<level; ++i) {
			insert += "\t";
		}
		
		editArea.value = contents.substring(0, pos) + insert + contents.substring(pos);
		setCursorPos(pos+insert.length);
		
		return false;
	} else {
		// IE support is currently broken
		return true;
	}
}

function setCursorPos(start, end) {
	if (start == -1) start = editArea.value.length;
	if (!end) end = start;

	if (window.getSelection) {
		// for mozilla, set the focus to scroll the input line into view
		editArea.focus();
		editArea.setSelectionRange(start, end);
		editArea.focus();
	} else if (document.selection) { // IE
		var mtext=editArea.createTextRange();
		mtext.collapse(true);
		mtext.moveStart('character', start);
		mtext.collapse(true);
		if (end != start) {
			mtext.moveEnd('character', (end-start));
		}
		mtext.select();
	} else {
		alert("Unsupported browser1");
	}
}

function getCursorPos() {
	if (window.getSelection) { // mozilla style!
		var selection=window.getSelection();
		if (selection.anchorNode) {
			var len = editArea.selectionEnd;
			return len;
		}
	} else if (document.selection) { // IE
		var mtext=document.selection.createRange().duplicate();
		alert(mtext.text.length);
		var count=0;
		var moved=0;
		while (moved=mtext.moveStart('character', -100)) {
			count-=moved;
		}
		alert(mtext.text.length + ", " + count);
		return mtext.text.length;
	} else {
		alert("Unsupported browser2");
	}
}

function getLinePos(pos) {
	var contents = editArea.value;
	var i=0
	var count=0;
	while (i<contents.length) {
		if (count == pos) break;
		if (contents.charAt(i) == "\n") ++count;
		++i;
	}
	return i;
}

function handleMouseClick() {

}

function do_ctrlUp() {
	if (editArea.rows > 6) editArea.rows--;
	createCookie('editorHeight', editArea.rows);
}

function do_ctrlDown() {
	editArea.rows++;
	createCookie('editorHeight', editArea.rows);
}

function do_ctrlRight() {
	editArea.cols++;
}

function do_ctrlLeft() {
	if (editArea.cols > 40) editArea.cols--;
}

function do_compile() {
	//validate_submitForm(document.submitForm);
	document.submitForm.submit();
}

function do_save() {
    clearTimeout(autosaveClock);
    saveDraft();
}

function htmlEscape(text) {
	var ret = '';
	var i;
	var code;
	var c;
	
	for (i=0; i<text.length; ++i) {
		c = text.charAt(i);
		if (c == '<') {
			ret += '&lt;';
		} else if (c == '>') {
			ret += '&gt;';
		} else if (c == '&') {
			ret += '&amp;';
		} else if (c == '"') {
			ret += '&quot;';
		} else {
			ret += c;
		}
	}
	return ret;
}

function handleTestButton() {
	var label = getObj('custom_input1');
	var field = getObj('custom_input2');
	if (label.style.display == "none") {
		label.style.display = "block";
		field.style.display = "block";
		getObj("custom_button").value = "Test with example input";
		createCookie('testMode', 'custom');
	} else {
		label.style.display = "none";
		field.style.display = "none";
		getObj("custom_button").value = "Test with custom input";
		createCookie('testMode', 'examples');
	}
}

function urlEncode(txt)
{
    if (encodeURIComponent)
        return encodeURIComponent(txt);
    
    var ret = "";
    for (i=0; i<txt.length; ++i) {
        if (txt.charAt(i) == '+')
            ret += "%2B";
        else
            ret += escape(txt.charAt(i));
    }
    return ret;
}

function saveDraft()
{
    if (editArea.value.length != 0) {
        var url = location.href.substring(0, location.href.lastIndexOf('/')) + '/draft.php';
        var str = "source=" + urlEncode(editArea.value) +
                "&language=" + urlEncode(document.submitForm.language.value) +
                "&contest_id=" + urlEncode(GET['id']) +
                "&prob_id=" + urlEncode(GET['prob_id'])
        saveReq = asyncRequest(url, str, processSave);
        if (saveReq != null) editStatus.innerHTML = "Autosaving...";
    }
    
    autosaveClock = setTimeout("saveDraft()", autosaveInterval*1000);
}

function processSave() 
{
    // only if req shows "complete"
    if (saveReq && saveReq.readyState == 4) {
        // only if "OK"
        if (saveReq.status == 200) {
            if (saveReq.responseText != "saved") {
                editStatus.innerHTML = "<b>Autosave failed.</b><br/>\n" + saveReq.responseText;
            } else {
                var date = new Date();
                editStatus.innerHTML = "Autosaved at " + 
                    formatTime(date.getHours(), date.getMinutes(), date.getSeconds()) + 
                    " Local Time.";
            }
        } else {
            alert("Autosaving XMLHttpRequest failed:\n" + saveReq.statusText);
        }
    }
}

function discardDraft()
{
    var url = location.href.substring(0, location.href.lastIndexOf('/')) + '/draft.php';
    discardReq = asyncRequest(url, "discard=1", processDiscard);
    if (discardReq != null) editStatus.innerHTML = "Discarding...";
}


function processDiscard()
{
    // only if req shows "complete"
    if (discardReq && discardReq.readyState == 4) {
        // only if "OK"
        if (discardReq.status == 200) {
            clearTimeout(autosaveClock);
            saveDraft();
        }
    }
}

function toggleShowShortcuts()
{
    var e = getObj('shortcuts');
    var el = getObj('shortcuts_link');
    if (showShortcuts) {
        e.innerHTML = '';
        el.innerHTML = '[+] Useful Editor Shortcuts:';
        showShortcuts = false;
    } else {
        e.innerHTML = '<dl><dt>Ctrl+Up/Down</dt><dd>Adjust height of coding area.</dd><dt>F8</dt><dd>Compile and test solution.</dd><dt>F2</dt><dd>Save a draft of the solution.</dd></dl>';
		el.innerHTML = '[-] Useful Editor Shortcuts:';
        showShortcuts = true;
    }
}

function problemCheck()
{
    var url = location.href.substring(0, location.href.lastIndexOf('/')) + '/problem-version.php';
    checkReq = asyncRequest(url, 'contest_id='+urlEncode(GET['id'])+'&prob_id='+urlEncode(GET['prob_id']), handleProblemCheck);
    
    setTimeout("problemCheck()", checkInterval*1000);
}

function handleProblemCheck()
{
    if (checkReq && checkReq.readyState == 4) {
        if (checkReq.status == 200) {
            if (checkReq.responseText.substring(0, 3)  == "ver") {
                if (Number(checkReq.responseText.substring(3)) != problemVersion) {
                    var msg = "The current problem's contents have been changed on server. Please refresh your page to make sure you're viewing the latest version which might have corrections."
                    
                    if (editArea.value.length != 0) {
                        msg += "\n\nBefore you hit refresh, please save a draft of your solution code by hitting F2. The draft will then be loaded on refresh. If autosave fails for some reason, or you do not want to use it, then you may locally save the code, and then hit refresh.";
                    }
                    
                    alert(msg);
                }
            }
        }
    }
}

function registerProblemCheck()
{
    setTimeout("problemCheck()", 1000);
}
addInit(registerProblemCheck);
