# learnings


## Hero Background Enhancement (Completed)
- Multi-layer background structure: base gradient → noise texture → mesh gradient
- Noise texture: inline SVG data URI with fractalNoise filter (opacity 0.03)
- Mesh gradient: 4 radial-gradients positioned at different coordinates with brand colors (orange, violet, pink, indigo)
- Decorative blur elements: 4 elements with /25 opacity for atmospheric depth
- Pattern: Fragment-based approach allows conditional rendering (heroImageUrl vs fallback)
