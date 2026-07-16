//! Tone curve representation shared by every film simulation. A curve is a
//! small set of (input, output) control points in normalized [0,1] space,
//! evaluated with monotonic piecewise-linear interpolation. Deliberately
//! simple (not a spline) so the exact same control points can be evaluated
//! identically in Rust and in GLSL (`mix()` between the two bracketing
//! points), which is what the Rust/GLSL parity requirement in the plan
//! depends on.

#[derive(Debug, Clone, PartialEq)]
pub struct ToneCurve {
    /// Control points, must be sorted by `.0` ascending and start at x=0,
    /// end at x=1.
    points: Vec<(f32, f32)>,
}

impl ToneCurve {
    pub fn new(points: Vec<(f32, f32)>) -> Self {
        debug_assert!(points.len() >= 2, "a curve needs at least 2 control points");
        debug_assert!((points[0].0 - 0.0).abs() < f32::EPSILON, "curve must start at x=0");
        debug_assert!((points.last().unwrap().0 - 1.0).abs() < f32::EPSILON, "curve must end at x=1");
        Self { points }
    }

    pub fn identity() -> Self {
        Self::new(vec![(0.0, 0.0), (1.0, 1.0)])
    }

    /// Evaluate the curve at `x` (clamped to [0,1]).
    pub fn apply(&self, x: f32) -> f32 {
        let x = x.clamp(0.0, 1.0);
        for pair in self.points.windows(2) {
            let (x0, y0) = pair[0];
            let (x1, y1) = pair[1];
            if x >= x0 && x <= x1 {
                let t = if x1 > x0 { (x - x0) / (x1 - x0) } else { 0.0 };
                return y0 + t * (y1 - y0);
            }
        }
        self.points.last().unwrap().1
    }

    pub fn points(&self) -> &[(f32, f32)] {
        &self.points
    }
}
