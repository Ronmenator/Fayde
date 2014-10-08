/// <reference path="../Core/DependencyObject.ts" />
/// <reference path="../Core/XamlObjectCollection.ts" />

module Fayde.Media {
    export class Geometry extends DependencyObject implements minerva.IGeometry {
        private _Path: Path.RawPath = null;
        private _LocalBounds = new minerva.Rect();

        static TransformProperty = DependencyProperty.Register("Transform", () => Transform, Geometry);
        Transform: Transform;

        constructor () {
            super();
            this._LocalBounds.width = Number.NEGATIVE_INFINITY;
            this._LocalBounds.height = Number.NEGATIVE_INFINITY;
        }

        GetBounds (pars?: Path.IStrokeParameters): minerva.Rect {
            var compute = minerva.Rect.isEmpty(this._LocalBounds);

            if (!this._Path) {
                this._Path = this._Build();
                compute = true;
            }

            if (compute)
                minerva.Rect.copyTo(this.ComputePathBounds(pars), this._LocalBounds);

            var bounds = new minerva.Rect();
            minerva.Rect.copyTo(this._LocalBounds, bounds);
            var transform = this.Transform;
            if (transform != null)
                bounds = transform.TransformBounds(bounds);

            return bounds;
        }

        Draw (ctx: minerva.core.render.RenderContext) {
            if (!this._Path)
                return;

            var raw = ctx.raw;
            var transform = this.Transform;
            if (transform != null) {
                raw.save();
                ctx.transformMatrix(transform.Value._Raw);
            }
            this._Path.Draw(raw);
            if (transform != null)
                raw.restore();
        }

        ComputePathBounds (pars: Path.IStrokeParameters): minerva.Rect {
            if (!this._Path)
                this._Path = this._Build();
            if (!this._Path)
                return new minerva.Rect();
            return this._Path.CalculateBounds(pars);
        }

        InvalidateGeometry () {
            this._Path = null;
            var lb = this._LocalBounds;
            lb.x = lb.y = 0;
            lb.width = lb.height = Number.NEGATIVE_INFINITY;
            Incite(this);
        }

        _Build (): Path.RawPath {
            return undefined;
        }

        Serialize (): string {
            var path = this._Path;
            if (!path)
                return;
            return path.Serialize();
        }
    }
    Fayde.RegisterType(Geometry, "Fayde.Media", Fayde.XMLNS);

    module reactions {
        DPReaction<Transform>(Geometry.TransformProperty, (geom: Geometry, ov, nv) => geom.InvalidateGeometry());
    }

    export class GeometryCollection extends XamlObjectCollection<Geometry> {
        AddingToCollection (value: Geometry, error: BError): boolean {
            if (!super.AddingToCollection(value, error))
                return false;
            ReactTo(value, this, () => Incite(this));
            Incite(this);
            return true;
        }

        RemovedFromCollection (value: Geometry, isValueSafe: boolean) {
            super.RemovedFromCollection(value, isValueSafe);
            UnreactTo(value, this);
            Incite(this);
        }
    }
    Fayde.RegisterType(GeometryCollection, "Fayde.Media", Fayde.XMLNS);
}