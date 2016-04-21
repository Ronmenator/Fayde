/// <reference path="Border.ts" />
/// <reference path="Control.ts" />
/// <reference path="../core/SizeChangedEventArgs.ts" />
/// <reference path="Canvas.ts" />

module Fayde.Controls {

    export class HtmlFrame extends Fayde.Controls.Control {
        protected $element: HTMLIFrameElement;
        static SourceProperty = DependencyProperty.Register("Source", () => Uri, HtmlFrame, undefined, (d, args) => (<HtmlFrame>d).SourcePropertyChanged(args));
        Source: Uri;
        
        private _Border: Border;

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
        
        OnApplyTemplate() {
            this._Border = <Border>this.GetTemplateChild("PART_Border", Border);
            setTimeout(() => {
                var pos = this._GetLeftTop();
                this.$element.style.left = pos.x + "px";
                this.$element.style.top = pos.y + "px";                
            }, 100);
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
            var startPoint = new Point(0, 0);
            var p2 = minerva.vec2.create(startPoint.x, startPoint.y);
            minerva.mat3.transformVec2(this._Border.XamlNode.LayoutUpdater.assets.absoluteXform, p2);
            return new Point(p2[0], p2[1]);
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