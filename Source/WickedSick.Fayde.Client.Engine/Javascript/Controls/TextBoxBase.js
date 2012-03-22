/// <reference path="../Runtime/Nullstone.js" />
/// <reference path="Control.js"/>
/// CODE
/// <reference path="../Runtime/MulticastEvent.js"/>
/// <reference path="../Primitives/Font.js"/>
/// <reference path="Enums.js"/>
/// <reference path="../TextLayout/TextBuffer.js"/>
/// <reference path="TextBoxHistory/TextBoxUndoStack.js"/>

//#region TextBoxBase
var TextBoxBase = Nullstone.Create("TextBoxBase", Control);

TextBoxBase.Instance.Init = function () {
    this.Init$Control();

    this._Undo = new _TextBoxUndoStack(10);
    this._Redo = new _TextBoxUndoStack(10);
    this._Buffer = new _TextBuffer();
    this._MaxLength = 0;

    this._Emit = _TextBoxEmitChanged.NOTHING;

    this._SelectionAnchor = 0;
    this._SelectionCursor = 0;
    this._CursorOffset = 0;
    this._Batch = 0;

    this._Font = new Font();

    this.ModelChanged = new MulticastEvent();

    this._NeedIMReset = false;
    this._Selecting = false;
    this._Captured = false;
    this._IsFocused = false;
    this._SettingValue = true;
};

TextBoxBase.Instance.HasSelectedText = function () {
    return this._SelectionCursor !== this._SelectionAnchor;
};
TextBoxBase.Instance.GetFont = function () {
    return this._Font;
};
TextBoxBase.Instance.GetTextDecorations = function () {
    return TextDecorations.None;
};
TextBoxBase.Instance.GetSelectionCursor = function () {
    return this._SelectionCursor;
};
TextBoxBase.Instance.GetSelectionStart = function () {
    AbstractMethod("TextBoxBase.GetSelectionStart");
};
TextBoxBase.Instance.SetSelectionStart = function (value) {
    AbstractMethod("TextBoxBase.SetSelectionStart");
};
TextBoxBase.Instance.GetSelectionLength = function () {
    AbstractMethod("TextBoxBase.GetSelectionLength");
};
TextBoxBase.Instance.SetSelectionLength = function (value) {
    AbstractMethod("TextBoxBase.SetSelectionLength");
};
TextBoxBase.Instance.GetCaretBrush = function () {
    return null;
};

TextBoxBase.Instance.OnApplyTemplate = function () {
    this._ContentElement = this.GetTemplateChild("ContentElement");

    if (this._ContentElement == null) {
        Warn("No ContentElement found");
        this.OnApplyTemplate$Control();
        return;
    }

    if (this._View != null) {
        this._View.SetTextBox(null);
    }

    this._View = new _TextBoxView();
    this._View.SetEnableCursor(!this._IsReadOnly);
    this._View.SetTextBox(this);

    if (this._ContentElement instanceof ContentPresenter) {
        this._ContentElement.SetContent(this._View);
    } else if (this._ContentElement instanceof ContentControl) {
        this._ContentElement.SetContent(this._View);
    } else if (this._ContentElement instanceof Border) {
        this._ContentElement.SetChild(this._View);
    } else if (this._ContentElement instanceof Panel) {
        this._ContentElement.GetChildren().Add(this._View);
    } else {
        Warn("Can't handle ContentElement.");
        this._View.SetTextBox(null);
        this._View = null;
    }
    this.OnApplyTemplate$Control();
};

TextBoxBase.Instance.OnMouseLeftButtonDown = function (sender, args) {
    //TODO: Set handled (routed event)
    this.Focus();

    if (this._View) {
        var p = args.GetPosition(this._View);
        var cursor = this._View.GetCursorFromXY(p.X, p.Y);

        this._ResetIMContext();

        this._Captured = this.CaptureMouse();
        this._Selecting = true;

        this._BatchPush();
        this._Emit = _TextBoxEmitChanged.NOTHING;
        this.SetSelectionStart(cursor);
        this.SetSelectionLength(0);
        this._BatchPop();

        this._SyncAndEmit();
    }
};
TextBoxBase.Instance.OnMouseLeftButtonUp = function (sender, args) {
    if (this._Captured)
        this.ReleaseMouseCapture();

    //TODO: Set handled (routed event)
    this._Selecting = false;
    this._Captured = false;
};
TextBoxBase.Instance.OnMouseMove = function (sender, args) {
    var anchor = this._SelectionAnchor;
    var cursor = this._SelectionCursor;

    if (this._Selecting) {
        var p = args.GetPosition(this._View);
        //TODO: Set handled (routed event)

        cursor = this._View.GetCursorFromXY(p.X, p.Y);

        this._BatchPush();
        this._Emit = _TextBoxEmitChanged.NOTHING;
        this.SetSelectionStart(Math.min(anchor, cursor));
        this.SetSelectionLength(Math.abs(cursor - anchor));
        this._SelectionAnchor = anchor;
        this._SelectionCursor = cursor;
        this._BatchPop();

        this._SyncAndEmit();

        //TODO: 
        //if (!this._Secret && (clipboard = this.GetClipboard(this, Primary))) {
        //  clipboard.SetText(this.GetSelectedText());
        //}
    }
};

TextBoxBase.Instance.OnLostFocus = function (sender, args) {
    this._IsFocused = false;
    if (this._View)
        this._View.OnLostFocus();

    if (!this._IsReadOnly) {
        //this._IMCtx.FocusOut();
        this._NeedIMReset = true;
    }
};
TextBoxBase.Instance.OnGotFocus = function (sender, args) {
    this._IsFocused = true;
    if (this._View)
        this._View.OnGotFocus();
    if (!this._IsReadOnly) {
        //this._IMCtx.FocusIn();
        this._NeedIMReset = true;
    }
};

TextBoxBase.Instance._BatchPush = function () {
    this._Batch++;
};
TextBoxBase.Instance._BatchPop = function () {
    if (this._Batch == 0) {
        Warn("TextBoxBase._Batch underflow");
        return;
    }
    this._Batch--;
};
TextBoxBase.Instance._SyncAndEmit = function (syncText) {
    if (syncText === undefined)
        syncText = true;

    if (this._Batch != 0 || this._Emit === _TextBoxEmitChanged.NOTHING)
        return;

    if (syncText && (this._Emit & _TextBoxEmitChanged.TEXT))
        this._SyncText();

    if (this._Emit & _TextBoxEmitChanged.SELECTION)
        this._SyncSelectedText();

    if (this._IsLoaded) {
        this._Emit &= this._EventsMask;
        if (this._Emit & _TextBoxEmitChanged.TEXT)
            this._EmitTextChanged();
        if (this._Emit & _TextBoxEmitChanged.SELECTION)
            this._EmitSelectionChanged();
    }

    this._Emit = _TextBoxEmitChanged.NOTHING;
};

TextBoxBase.Instance._SyncText = function () {
    AbstractMethod("TextBoxBase._SyncText");
};
TextBoxBase.Instance._EmitTextChanged = function () { };

TextBoxBase.Instance.SelectAll = function () {
    this._Select(0, this._Buffer.GetLength());
};
TextBoxBase.Instance.ClearSelection = function (start) {
    this._BatchPush();
    this.SetSelectionStart(start);
    this.SetSelectionLength(0);
    this._BatchPop();
};
TextBoxBase.Instance.Select = function (start, length) {
    if (start < 0)
        throw new ArgumentException("start < 0");
    if (length < 0)
        throw new ArgumentException("length < 0");

    if (start > this._Buffer.GetLength())
        start = this._Buffer.GetLength();

    if (length > (this._Buffer.GetLength() - start))
        length = this._Buffer.GetLength() - start;

    this._BatchPush();
    this.SetSelectionStart(start);
    this.SetSelectionLength(length);
    this._BatchPop();

    this._ResetIMContext();

    this._SyncAndEmit();

    return true;
};
TextBoxBase.Instance._SyncSelectedText = function () {
    AbstractMethod("TextBoxBase._SyncSelectedText");
};
TextBoxBase.Instance._EmitSelectionChanged = function () { };

TextBoxBase.Instance._ResetIMContext = function () {
    if (this._NeedIMReset) {
        //this._IMCtx.Reset();
        this._NeedIMReset = false;
    }
};

TextBoxBase.Instance.CanUndo = function () {
    return !this._Undo.IsEmpty();
};
TextBoxBase.Instance.Undo = function () {
    if (this._Undo.IsEmpty())
        return;

    var action = this._Undo.Pop();
    this._Redo.Push(action);

    if (action instanceof _TextBoxUndoActionInsert) {
        this._Buffer.Cut(action._Start, action._Length);
    } else if (action instanceof _TextBoxUndoActionDelete) {
        this._Buffer.Insert(action._Start, action._Text);
    } else if (action instanceof _TextBoxUndoActionReplace) {
        this._Buffer.Cut(action._Start, action._Inserted.length);
        this._Buffer.Insert(action._Start, action._Deleted);
    }
    var anchor = action._SelectionAnchor;
    var cursor = action._SelectionCursor;

    this._BatchPush();
    this.SetSelectionStart(Math.min(anchor, cursor));
    this.SetSelectionLength(Math.abs(cursor - anchor));
    this._Emit = _TextBoxEmitChanged.TEXT | _TextBoxEmitChanged.SELECTION;
    this._SelectionAnchor = anchor;
    this._SelectionCursor = cursor;
    this._BatchPop();

    this._SyncAndEmit();
};
TextBoxBase.Instance.CanRedo = function () {
    return !this._Redo.IsEmpty();
};
TextBoxBase.Instance.Redo = function () {
    if (this._Redo.IsEmpty())
        return;

    var action = this._Redo.Pop();
    this._Undo.Push(action);

    var anchor;
    var cursor;
    if (action instanceof _TextBoxUndoActionInsert) {
        this._Buffer.Insert(action._Start, action._Buffer._Text);
        anchor = cursor = action._Start + action._Buffer.GetLength();
    } else if (action instanceof _TextBoxUndoActionDelete) {
        this._Buffer.Cut(action._Start, action._Length);
        anchor = cursor = action._Start;
    } else if (action instanceof _TextBoxUndoActionReplace) {
        this._Buffer.Cut(action._Start, action._Length);
        this._Buffer.Insert(action._Start, action._Inserted);
        anchor = cursor = action._Start + action._Inserted.length;
    }

    this._BatchPush();
    this.SetSelectionStart(Math.min(anchor, cursor));
    this.SetSelectionLength(Math.abs(cursor - anchor));
    this._Emit = _TextBoxEmitChanged.TEXT | _TextBoxEmitChanged.SELECTION;
    this._SelectionAnchor = anchor;
    this._SelectionCursor = cursor;
    this._BatchPop();

    this._SyncAndEmit();
};

//#region Property Changed

TextBoxBase.Instance._OnPropertyChanged = function (args, error) {
    var changed = _TextBoxModelChanged.Nothing;
    if (args.Property._ID === Control.FontFamilyProperty._ID) {
        this._Font.SetFamily(args.NewValue);
        changed = _TextBoxModelChanged.Font;
    } else if (args.Property._ID === Control.FontSizeProperty._ID) {
        this._Font.SetSize(args.NewValue);
        changed = _TextBoxModelChanged.Font;
    } else if (args.Property._ID === Control.FontStretchProperty._ID) {
        this._Font.SetStretch(args.NewValue);
        changed = _TextBoxModelChanged.Font;
    } else if (args.Property._ID === Control.FontStyleProperty._ID) {
        this._Font.SetStyle(args.NewValue);
        changed = _TextBoxModelChanged.Font;
    } else if (args.Property._ID === Control.FontWeightProperty._ID) {
        this._Font.SetWeight(args.NewValue);
        changed = _TextBoxModelChanged.Font;
    }

    if (changed !== _TextBoxModelChanged.Nothing)
        this.ModelChanged.Raise(this, new _TextBoxModelChangedEventArgs(changed, args));

    if (args.Property.OwnerType !== TextBoxBase) {
        this._OnPropertyChanged$Control(args, error);
        return;
    }

    this.PropertyChanged.Raise(this, args);
};
TextBoxBase.Instance._OnSubPropertyChanged = function (propd, sender, args) {
    if (propd != null && (propd._ID === Control.BackgroundProperty._ID
        || propd._ID === Control.ForegroundProperty._ID)) {
        this.ModelChanged.Raise(this, new _TextBoxModelChangedEventArgs(_TextBoxModelChanged.Brush, args));
        this._Invalidate();
    }

    if (propd != null && propd.OwnerType !== TextBoxBase)
        this._OnSubPropertyChanged$Control(propd, sender, args);
};

//#endregion

//#region Cursor

TextBoxBase.Instance.CursorDown = function (cursor, isPage) {
    return cursor;
};
TextBoxBase.Instance.CursorUp = function (cursor, isPage) {
    return cursor;
};
TextBoxBase.Instance.CursorNextWord = function (cursor) {
    return cursor;
};
TextBoxBase.Instance.CursorPrevWord = function (cursor) {
    return cursor;
};
TextBoxBase.Instance.CursorLineBegin = function (cursor) {
    return cursor;
};
TextBoxBase.Instance.CursorLineEnd = function (cursor) {
    return cursor;
};

TextBoxBase.Instance._EmitCursorPositionChanged = function (height, x, y) {
    //NotImplemented("TextBoxBase._EmitCursorPositionChanged");
};

//#endregion

//#region Keyboard

TextBoxBase.Instance.OnKeyDown = function (sender, args) {
    switch (args.KeyCode) {
        case 16: //shift
        case 17: //ctrl
        case 18: //alt
            return;
    }

    var handled = false;
    this._Emit = _TextBoxEmitChanged.NOTHING;

    this._BatchPush();

    switch (args.KeyCode) {
        case Keys.Backspace:
            if (this._IsReadOnly)
                break;
            handled = this._KeyDownBackSpace(args.Modifiers);
            break;
        case Keys.Delete:
            if (this._IsReadOnly)
                break;
            if (args.Modifiers.Shift) {
                //Shift+Delete => Cut
                handled = true;
            } else {
                handled = this._KeyDownDelete(args.Modifiers);
            }
            break;
        case Keys.Insert:
            if (args.Modifiers.Shift) {
                //Shift+Insert => Paste
                handled = true;
            } else if (args.Modifiers.Ctrl) {
                //Ctrl+Insert => Copy
                handled = true;
            }
            break;
        case Keys.PageDown:
            handled = this._KeyDownPageDown(args.Modifiers);
            break;
        case Keys.PageUp:
            handled = this._KeyUpPageDown(args.Modifiers);
            break;
        case Keys.Home:
            handled = this._KeyDownHome(args.Modifiers);
            break;
        case Keys.End:
            handled = this._KeyDownEnd(args.Modifiers);
            break;
        case Keys.Left:
            handled = this._KeyDownLeft(args.Modifiers);
            break;
        case Keys.Right:
            handled = this._KeyDownRight(args.Modifiers);
            break;
        case Keys.Down:
            handled = this._KeyDownDown(args.Modifiers);
            break;
        case Keys.Up:
            handled = this._KeyDownUp(args.Modifiers);
            break;
        default:
            if (args.Modifiers.Ctrl) {
                switch (args.KeyCode) {
                    case 65:
                        //Ctrl+A => Select All
                        handled = true;
                        this.SelectAll();
                        break;
                    case 67:
                        //Ctrl+C => Copy
                        //copy to clipboard
                        handled = true;
                        break;
                    case 88:
                        //Ctrl+X => Cut
                        if (this._IsReadOnly)
                            break;
                        //copy to clipboard
                        this.SetSelectedText("");
                        handled = true;
                        break;
                    case 89:
                        //Ctrl+Y => Redo
                        if (!this.IsReadOnly) {
                            handled = true;
                            this.Redo();
                        }
                        break;
                    case 90:
                        //Ctrl+Z => Undo
                        if (!this.IsReadOnly) {
                            handled = true;
                            this.Undo();
                        }
                        break;
                }
            }
            break;
    }

    if (handled) {
        args.Handled = handled;
        this._ResetIMContext();
    }
    this._BatchPop();
    this._SyncAndEmit();

    if (!args.Handled)
        this.PostOnKeyDown(sender, args);
};
TextBoxBase.Instance.PostOnKeyDown = function (sender, args) {
    if (args.Handled)
        return;

    /*
    if (!this._IsReadOnly && this._IMCtx.FilterKeyPress()) {
    this._NeedIMReset = true;
    return;
    }
    */

    if (this._IsReadOnly || args.Modifiers.Alt || args.Modifiers.Ctrl)
        return;

    this._Emit = _TextBoxEmitChanged.NOTHING;
    this._BatchPush();

    switch (args.KeyCode) {
        case Keys.Enter:
            this._KeyDownChar('\r');
            break;
        default:
            if (!args.Modifiers.Ctrl && !args.Modifiers.Alt) {
                this._KeyDownChar(String.fromCharCode(args.KeyCode));
            }
            break;
    }

    this._BatchPop();
    this._SyncAndEmit();
};

TextBoxBase.Instance._KeyDownBackSpace = function (modifiers) {
    if (modifiers.Shift || modifiers.Alt)
        return false;

    var anchor = this._SelectionAnchor;
    var cursor = this._SelectionCursor;
    var start = 0;
    var length = 0;
    var handled = false;

    if (cursor !== anchor) {
        length = Math.abs(cursor - anchor);
        start = Math.min(anchor, cursor);
    } else if (modifiers.Ctrl) {
        start = this.CursorPrevWord(cursor);
        length = cursor - start;
    } else if (cursor > 0) {
        if (cursor >= 2 && this._Buffer._Text && this._Buffer._Text.charAt(cursor - 2) == '\r' && this._Buffer._Text.charAt(cursor - 1) == '\n') {
            start = cursor - 2;
            length = 2;
        } else {
            start = cursor - 1;
            length = 1;
        }
    }

    if (length > 0) {
        action = new _TextBoxUndoActionDelete(this._SelectionAnchor, this._SelectionCursor, this._Buffer, start, length);
        this._Undo.Push(action);
        this._Redo.Clear();

        this._Buffer.Cut(start, length);
        this._Emit |= _TextBoxEmitChanged.TEXT;
        anchor = start;
        cursor = start;
        handled = true;
    }

    if (this._SelectionAnchor !== anchor || this._SelectionCursor !== cursor) {
        this.SetSelectionStart(Math.min(anchor, cursor));
        this.SetSelectionLength(Math.abs(cursor - anchor));
        this._SelectionAnchor = anchor;
        this._SelectionCursor = cursor;
        this._Emit |= _TextBoxEmitChanged.SELECTION;
        handled = true;
    }

    return handled;
};
TextBoxBase.Instance._KeyDownDelete = function (modifiers) {
    if (modifiers.Shift || modifiers.Alt)
        return false;

    var anchor = this._SelectionAnchor;
    var cursor = this._SelectionCursor;
    var start = 0;
    var length = 0;
    var handled = false;

    if (cursor !== anchor) {
        length = Math.abs(cursor - anchor);
        start = Math.min(anchor, cursor);
    } else if (modifiers.Ctrl) {
        //Ctrl+Delete => delete the word start at the cursor
        length = this.CursorNextWord(cursor) - cursor;
        start = cursor;
    } else if (this._Buffer._Text && cursor < this._Buffer._Text.length) {
        if (this._Buffer._Text.charAt(cursor) === '\r' && this._Buffer._Text.charAt(cursor + 1) === '\n')
            length = 2;
        else
            length = 1;
        start = cursor;
    }

    if (length > 0) {
        action = new _TextBoxUndoActionDelete(this._SelectionAnchor, this._SelectionCursor, this._Buffer, start, length);
        this._Undo.Push(action);
        this._Redo.Clear();

        this._Buffer.Cut(start, length);
        this._Emit |= _TextBoxEmitChanged.TEXT;
        handled = true;
    }

    if (this._SelectionAnchor !== anchor || this._SelectionCursor !== cursor) {
        this.SetSelectionStart(Math.min(anchor, cursor));
        this.SetSelectionLength(Math.abs(cursor - anchor));
        this._SelectionAnchor = anchor;
        this._SelectionCursor = cursor;
        this._Emit |= _TextBoxEmitChanged.SELECTION;
        handled = true;
    }

    return handled;
};
TextBoxBase.Instance._KeyDownPageDown = function (modifiers) {
    if (modifiers.Alt)
        return false;

    var anchor = this._SelectionAnchor;
    var cursor = this._SelectionCursor;

    cursor = this.CursorDown(cursor, true);
    var have = this._HaveOffset;

    if (!modifiers.Shift) {
        anchor = cursor;
    }

    if (this._SelectionAnchor !== anchor || this._SelectionCursor !== cursor) {
        this.SetSelectionStart(Math.min(anchor, cursor));
        this.SetSelectionLength(Math.abs(cursor - anchor));
        this._SelectionAnchor = anchor;
        this._SelectionCursor = cursor;
        this._Emit |= _TextBoxEmitChanged.SELECTION;
        this._HaveOffset = have;
    }

    return true;
};
TextBoxBase.Instance._KeyDownPageUp = function (modifiers) {
    if (modifiers.Alt)
        return false;

    var anchor = this._SelectionAnchor;
    var cursor = this._SelectionCursor;

    cursor = this.CursorUp(cursor, true);
    var have = this._HaveOffset;

    if (!modifiers.Shift) {
        anchor = cursor;
    }

    if (this._SelectionAnchor !== anchor || this._SelectionCursor !== cursor) {
        this.SetSelectionStart(Math.min(anchor, cursor));
        this.SetSelectionLength(Math.abs(cursor - anchor));
        this._SelectionAnchor = anchor;
        this._SelectionCursor = cursor;
        this._Emit |= _TextBoxEmitChanged.SELECTION;
        this._HaveOffset = have;
    }

    return true;
};
TextBoxBase.Instance._KeyDownHome = function (modifiers) {
    if (modifiers.Alt)
        return false;

    var anchor = this._SelectionAnchor;
    var cursor = this._SelectionCursor;
    var handled = false;

    if (modifiers.Ctrl) {
        cursor = 0;
    } else {
        cursor = this.CursorLineBegin(cursor);
    }

    if (!modifiers.Shift) {
        anchor = cursor;
    }

    if (this._SelectionAnchor !== anchor || this._SelectionCursor !== cursor) {
        this.SetSelectionStart(Math.min(anchor, cursor));
        this.SetSelectionLength(Math.abs(cursor - anchor));
        this._SelectionAnchor = anchor;
        this._SelectionCursor = cursor;
        this._Emit |= _TextBoxEmitChanged.SELECTION;
        this._HaveOffset = false;
        handled = true;
    }

    return handled;
};
TextBoxBase.Instance._KeyDownEnd = function (modifiers) {
    if (modifiers.Alt)
        return false;

    var anchor = this._SelectionAnchor;
    var cursor = this._SelectionCursor;
    var handled = false;

    if (modifiers.Ctrl) {
        cursor = this._Buffer.GetLength();
    } else {
        cursor = this.CursorLineEnd(cursor);
    }

    if (!modifiers.Shift) {
        anchor = cursor;
    }

    if (this._SelectionAnchor !== anchor || this._SelectionCursor !== cursor) {
        this.SetSelectionStart(Math.min(anchor, cursor));
        this.SetSelectionLength(Math.abs(cursor - anchor));
        this._SelectionAnchor = anchor;
        this._SelectionCursor = cursor;
        this._Emit |= _TextBoxEmitChanged.SELECTION;
        this._HaveOffset = false;
        handled = true;
    }

    return handled;
};
TextBoxBase.Instance._KeyDownLeft = function (modifiers) {
    if (modifiers.Alt)
        return false;

    var anchor = this._SelectionAnchor;
    var cursor = this._SelectionCursor;
    var handled = false;

    if (modifiers.Ctrl) {
        cursor = this.CursorPrevWord(cursor);
    } else if (!modifiers.Shift && anchor !== cursor) {
        cursor = Math.min(anchor, cursor);
    } else {
        if (cursor >= 2 && this._Buffer._Text && this._Buffer._Text.charAt(cursor - 2) === '\r' && this._Buffer._Text.charAt(cursor - 1) === '\n')
            cursor -= 2;
        else if (cursor > 0)
            cursor--;
    }

    if (!modifiers.Shift)
        anchor = cursor;

    if (this._SelectionAnchor !== anchor || this._SelectionCursor !== cursor) {
        this.SetSelectionStart(Math.min(anchor, cursor));
        this.SetSelectionLength(Math.abs(cursor - anchor));
        this._SelectionAnchor = anchor;
        this._SelectionCursor = cursor;
        this._Emit |= _TextBoxEmitChanged.SELECTION;
        handled = true;
    }

    return handled;
};
TextBoxBase.Instance._KeyDownRight = function (modifiers) {
    if (modifiers.Alt)
        return false;

    var anchor = this._SelectionAnchor;
    var cursor = this._SelectionCursor;
    var handled = false;

    if (modifiers.Ctrl) {
        cursor = this.CursorNextWord(cursor);
    } else if (!modifiers.Shift && anchor !== cursor) {
        cursor = Math.max(anchor, cursor);
    } else {
        if (this._Buffer._Text && this._Buffer._Text.charAt(cursor) === '\r' && this._Buffer._Text.charAt(cursor + 1) === '\n')
            cursor += 2;
        else if (cursor < this._Buffer.GetLength())
            cursor++;
    }

    if (!modifiers.Shift)
        anchor = cursor;

    if (this._SelectionAnchor !== anchor || this._SelectionCursor !== cursor) {
        this.SetSelectionStart(Math.min(anchor, cursor));
        this.SetSelectionLength(Math.abs(cursor - anchor));
        this._SelectionAnchor = anchor;
        this._SelectionCursor = cursor;
        this._Emit |= _TextBoxEmitChanged.SELECTION;
        handled = true;
    }

    return handled;
};
TextBoxBase.Instance._KeyDownDown = function (modifiers) {
    if (modifiers.Alt)
        return false;

    var anchor = this._SelectionAnchor;
    var cursor = this._SelectionCursor;
    var handled = false;

    cursor = this.CursorDown(cursor, false);
    var have = this._HaveOffset;

    if (!modifiers.Shift) {
        anchor = cursor;
    }

    if (this._SelectionAnchor !== anchor || this._SelectionCursor !== cursor) {
        this.SetSelectionStart(Math.min(anchor, cursor));
        this.SetSelectionLength(Math.abs(cursor - anchor));
        this._SelectionAnchor = anchor;
        this._SelectionCursor = cursor;
        this._Emit |= _TextBoxEmitChanged.SELECTION;
        this._HaveOffset = have;
        handled = true;
    }

    return handled;
};
TextBoxBase.Instance._KeyDownUp = function (modifiers) {
    if (modifiers.Alt)
        return false;

    var anchor = this._SelectionAnchor;
    var cursor = this._SelectionCursor;
    var handled = false;

    cursor = this.CursorUp(cursor, false);
    var have = this._HaveOffset;

    if (!modifiers.Shift) {
        anchor = cursor;
    }

    if (this._SelectionAnchor !== anchor || this._SelectionCursor !== cursor) {
        this.SetSelectionStart(Math.min(anchor, cursor));
        this.SetSelectionLength(Math.abs(cursor - anchor));
        this._SelectionAnchor = anchor;
        this._SelectionCursor = cursor;
        this._Emit |= _TextBoxEmitChanged.SELECTION;
        this._HaveOffset = have;
        handled = true;
    }

    return handled;
};
TextBoxBase.Instance._KeyDownChar = function (c) {
    var anchor = this._SelectionAnchor;
    var cursor = this._SelectionCursor;
    var length = Math.abs(cursor - anchor);
    var start = Math.min(anchor, cursor);
    var action;

    if ((this._MaxLength > 0 && this._Buffer.GetLength() >= this._MaxLength) || (c === '\r') && !this._AcceptsReturn)
        return false;

    if (length > 0) {
        action = new _TextBoxUndoActionReplace(anchor, cursor, this._Buffer, start, length, c);
        this._Undo.Push(action);
        this._Redo.Clear();

        this._Buffer.Replace(start, length, c);
    } else {
        var ins = null;
        action = this._Undo.Peek();
        if (action instanceof _TextBoxUndoActionInsert) {
            ins = action;
            if (!ins.Insert(start, c))
                ins = null;
        }

        if (!ins) {
            ins = new _TextBoxUndoActionInsert(anchor, cursor, start, c);
            this._Undo.Push(ins);
        }
        this._Redo.Clear();

        this._Buffer.Insert(start, c);
    }

    this._Emit |= _TextBoxEmitChanged.TEXT;
    cursor = start + 1;
    anchor = cursor;

    if (this._SelectionAnchor !== anchor || this._SelectionCursor !== cursor) {
        this.SetSelectionStart(Math.min(anchor, cursor));
        this.SetSelectionLength(Math.abs(cursor - anchor));
        this._SelectionAnchor = anchor;
        this._SelectionCursor = cursor;
        this._Emit |= _TextBoxEmitChanged.SELECTION;
    }

    return true;
};

//#endregion

Nullstone.FinishCreate(TextBoxBase);
//#endregion