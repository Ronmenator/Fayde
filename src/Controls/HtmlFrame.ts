/// <reference path="Control.ts" />
/// <reference path="../core/SizeChangedEventArgs.ts" />
/// <reference path="Canvas.ts" />

module Fayde.Controls {

    export class HtmlFrame extends Fayde.Controls.Control {
        protected $element: HTMLIFrameElement;
        static SourceProperty = DependencyProperty.Register("Source", () => Uri, HtmlFrame, undefined, (d, args) => (<HtmlFrame>d).SourcePropertyChanged(args));
        Source: Uri;

        constructor() {
            super();
            this.DefaultStyleKey = HtmlFrame;
            this.$element = this.createElement();
            this.$element.frameBorder = "0";
            this.$element.scrolling = "auto";
            this.$element.style.position = "absolute";
            this.$element.style.width = "100px";
            this.$element.style.height = "100px";
                        
            this.SizeChanged.on(this._HandleSizeChanged, this);
            this.Unloaded.on(this._HandleUnload, this);
            document.body.appendChild(this.$element);
        }
        
        private _HandleUnload(sender, e){
            document.body.removeChild(this.$element);
            this.$element = null;
        }
        
        private _HandleSizeChanged(sender, e: SizeChangedEventArgs) {
            this.$element.style.width = e.NewSize.width.toString() + "px";
            this.$element.style.height = e.NewSize.height.toString() + "px";
            
            var pos = this._GetLeftTop();
            this.$element.style.left = pos.x + "px";
            this.$element.style.top = pos.y + "px";
        }
        
        private _GetLeftTop() {
            var root = <FrameworkElement>VisualTreeHelper.GetRoot(this);
            if (!root) return;

            try {
                var xform = this.TransformToVisual(null);
            } catch (err) {
                return;
            }

            var offset = new Point(0, 0);
            var bottomRight = new Point(this.ActualWidth, this.ActualHeight);

            var topLeft = xform.Transform(offset);
            bottomRight = xform.Transform(bottomRight);

            var isRightToLeft = (this.FlowDirection === FlowDirection.RightToLeft);
            if (isRightToLeft) {
                var left = bottomRight.x;
                bottomRight.x = topLeft.x;
                topLeft.x = left;
            }
            
            return topLeft;
        }

        private SourcePropertyChanged(args: IDependencyPropertyChangedEventArgs) {
            this.$element.src = args.NewValue;
        }
                
        createElement(): HTMLIFrameElement {
            return <HTMLIFrameElement>document.createElement("IFRAME");
        }
    }
    
    Fayde.CoreLibrary.add(HtmlFrame);
}