# Image Sphere Component

**Added:** November 12, 2025  
**Source:** https://21st.dev/r/tonyzebastian/img-sphere  
**File:** `src/components/ui/img-sphere.jsx`

---

## Overview

A beautiful 3D sphere gallery component that displays images distributed on a sphere surface. Features drag rotation, momentum physics, touch support, and modal image viewing.

---

## Features

- ✨ **3D Sphere Distribution** - Fibonacci sphere algorithm for even image placement
- 🎯 **Interactive Rotation** - Drag to rotate with momentum physics
- 📱 **Touch Support** - Full touch/drag support for mobile
- 🔍 **Modal Viewing** - Click any image to view in detail
- ⚙️ **Highly Configurable** - Extensive customization options
- 🎨 **Smooth Animations** - Fade effects, scaling, and transitions
- 📐 **Collision Detection** - Prevents image overlap
- 🚀 **Auto-Rotate** - Optional automatic rotation

---

## Basic Usage

```jsx
import SphereImageGrid from '@/components/ui/img-sphere'

const images = [
  { id: 1, src: '/image1.jpg', alt: 'Image 1' },
  { id: 2, src: '/image2.jpg', alt: 'Image 2' },
  { id: 3, src: '/image3.jpg', alt: 'Image 3' },
  // ... more images
]

function MyComponent() {
  return (
    <SphereImageGrid 
      images={images}
      containerSize={400}
      autoRotate={true}
    />
  )
}
```

---

## Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `images` | Array | Array of image objects with `id`, `src`, `alt` |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `containerSize` | number | 400 | Size of the container in pixels (width & height) |
| `sphereRadius` | number | 200 | Radius of the sphere (affects spread) |
| `dragSensitivity` | number | 0.5 | How responsive dragging is (0.1-2.0) |
| `momentumDecay` | number | 0.95 | How quickly momentum fades (0-1) |
| `maxRotationSpeed` | number | 5 | Maximum rotation speed in degrees |
| `baseImageScale` | number | 0.12 | Base scale of images (0.05-0.3) |
| `hoverScale` | number | 1.2 | Scale multiplier on hover |
| `perspective` | number | 1000 | 3D perspective depth |
| `autoRotate` | boolean | false | Enable automatic rotation |
| `autoRotateSpeed` | number | 0.3 | Speed of auto-rotation |
| `className` | string | '' | Additional CSS classes |

---

## Image Object Format

```javascript
{
  id: unique_identifier,      // Required: Unique ID
  src: '/path/to/image.jpg',  // Required: Image URL
  alt: 'Description',          // Required: Alt text for accessibility
  title: 'Image Title',        // Optional: Shows in modal
  description: 'Details...'    // Optional: Shows in modal
}
```

---

## Examples

### Basic Sphere

```jsx
const teamPhotos = [
  { id: 1, src: '/team/ceo.jpg', alt: 'CEO' },
  { id: 2, src: '/team/cto.jpg', alt: 'CTO' },
  { id: 3, src: '/team/cfo.jpg', alt: 'CFO' },
]

<SphereImageGrid images={teamPhotos} />
```

### Auto-Rotating Portfolio

```jsx
<SphereImageGrid 
  images={portfolioImages}
  containerSize={500}
  autoRotate={true}
  autoRotateSpeed={0.5}
  baseImageScale={0.15}
/>
```

### Compact Mobile Sphere

```jsx
<SphereImageGrid 
  images={productImages}
  containerSize={300}
  sphereRadius={150}
  baseImageScale={0.1}
  dragSensitivity={0.7}
/>
```

### Product Gallery with Details

```jsx
const products = [
  {
    id: 1,
    src: '/products/item1.jpg',
    alt: 'Product 1',
    title: 'Premium Widget',
    description: '$99.99 - Best seller'
  },
  // ... more products
]

<SphereImageGrid 
  images={products}
  containerSize={600}
  hoverScale={1.3}
/>
```

---

## Features Explained

### 3D Sphere Distribution

Uses **Fibonacci sphere distribution** for even coverage:
- No clustering or gaps
- Beautiful natural distribution
- Covers top and bottom poles
- Slight randomization for organic feel

### Momentum Physics

Realistic momentum after dragging:
- Velocity tracked during drag
- Smooth deceleration after release
- Configurable decay rate
- Auto-rotate can be enabled

### Collision Detection

Prevents image overlap:
- Dynamic scaling to avoid overlaps
- Maintains minimum spacing
- Preserves visibility of all images
- Adaptive to image density

### Depth & Visibility

Smart visibility management:
- Images behind sphere are hidden
- Smooth fade zones
- Z-index based on depth
- Proper layering

---

## Styling

### Container Customization

```jsx
<SphereImageGrid 
  images={images}
  className="shadow-2xl rounded-xl bg-gradient-to-br from-blue-100 to-purple-100"
/>
```

### Modal Customization

The modal is built-in but can be styled via CSS:
```css
/* Target modal background */
.fixed.inset-0.z-50 { ... }

/* Target modal content */
.bg-white.rounded-xl { ... }
```

---

## Performance

### Optimization Features

- ✅ **Lazy Loading** - First 3 images eager, rest lazy
- ✅ **RAF Animation** - Uses requestAnimationFrame
- ✅ **Collision Caching** - Efficient overlap detection
- ✅ **Event Delegation** - Optimized event listeners
- ✅ **Proper Cleanup** - Removes listeners on unmount

### Recommended Image Counts

| Device | Recommended | Maximum |
|--------|-------------|---------|
| Mobile | 10-15 images | 20 images |
| Tablet | 15-25 images | 30 images |
| Desktop | 20-40 images | 50 images |

---

## Accessibility

### Features

- ✅ **Alt Text** - All images require alt text
- ✅ **Keyboard Nav** - Modal closable with Escape
- ✅ **Screen Reader** - Proper semantic HTML
- ✅ **Touch Support** - Full mobile accessibility
- ✅ **Loading States** - Clear loading indicator

### WCAG Compliance

- **1.1.1 Non-text Content** - Alt text required
- **2.1.1 Keyboard** - Modal keyboard accessible
- **2.5.1 Pointer Gestures** - Single-point drag support
- **4.1.2 Name, Role, Value** - Proper ARIA labels

---

## Use Cases

### Perfect For:

1. **Team/Company Photos** - Show your team in 3D
2. **Product Gallery** - Interactive product showcase
3. **Portfolio** - Creative portfolio display
4. **Event Photos** - Conference or event gallery
5. **Logo Wall** - Client/partner logos in 3D
6. **Achievement Badges** - Gamification display
7. **Social Proof** - Customer testimonials with photos
8. **Brand Assets** - Marketing materials showcase

### Not Ideal For:

- ❌ Large product catalogs (use grid/list instead)
- ❌ Detail-heavy images (hard to see at distance)
- ❌ Sequential content (use carousel instead)
- ❌ Comparison views (use side-by-side instead)

---

## Integration Examples

### Add to Dashboard

```jsx
// In your App.jsx or Dashboard component
import SphereImageGrid from '@/components/ui/img-sphere'

const teamPhotos = [
  // Your team images
]

<div className="my-8">
  <h2 className="text-2xl font-bold mb-4">Meet Our Team</h2>
  <SphereImageGrid 
    images={teamPhotos}
    containerSize={400}
    autoRotate={true}
    autoRotateSpeed={0.3}
  />
</div>
```

### Responsive Container

```jsx
<div className="w-full max-w-md mx-auto">
  <SphereImageGrid 
    images={images}
    containerSize={window.innerWidth < 768 ? 300 : 400}
  />
</div>
```

### With Loading State

```jsx
function ImageSphere() {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchImages().then(data => {
      setImages(data)
      setLoading(false)
    })
  }, [])

  if (loading) return <div>Loading gallery...</div>

  return <SphereImageGrid images={images} />
}
```

---

## Troubleshooting

### Images Not Showing

**Check:**
- Image URLs are valid and accessible
- Each image has unique `id`
- Alt text is provided
- Images array is not empty

### Sphere Feels Slow

**Adjust:**
```jsx
<SphereImageGrid 
  dragSensitivity={0.8}     // Increase for more responsive
  maxRotationSpeed={8}      // Increase for faster rotation
  momentumDecay={0.92}      // Decrease for longer momentum
/>
```

### Images Overlap

**Adjust:**
```jsx
<SphereImageGrid 
  baseImageScale={0.08}     // Reduce image size
  sphereRadius={250}        // Increase sphere size
/>
```

### Performance Issues

**Optimize:**
```jsx
<SphereImageGrid 
  images={images.slice(0, 20)}  // Reduce image count
  containerSize={300}           // Smaller container
/>
```

---

## Advanced Customization

### Custom Image Rendering

The component renders circular images by default. To customize:

1. Modify the `renderImageNode` function
2. Change border radius in styles
3. Add custom hover effects
4. Implement custom modal

### Physics Tuning

For different feels:

**Slow & Smooth:**
```jsx
dragSensitivity={0.3}
momentumDecay={0.98}
maxRotationSpeed={3}
```

**Fast & Snappy:**
```jsx
dragSensitivity={0.8}
momentumDecay={0.90}
maxRotationSpeed={10}
```

**Realistic Physics:**
```jsx
dragSensitivity={0.5}
momentumDecay={0.95}
maxRotationSpeed={5}
```

---

## Dependencies

**Already Included:**
- `react` - Core React library
- `lucide-react` - For X (close) icon in modal

**No Additional Dependencies Needed!** 🎉

---

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Full support |
| Safari | 14+ | ✅ Full support |
| Firefox | 88+ | ✅ Full support |
| Edge | 90+ | ✅ Full support |
| Mobile Safari | iOS 14+ | ✅ Full support |
| Chrome Android | 90+ | ✅ Full support |

---

## Summary

**Added:** ✅ `src/components/ui/img-sphere.jsx`  
**Size:** 556 lines  
**Dependencies:** None (uses existing packages)  
**Features:** 3D sphere, drag, touch, modal, auto-rotate  
**Performance:** Optimized with RAF and lazy loading  
**Accessibility:** WCAG 2.1 compliant  

**Ready to use!** Import and add to any component in your app! 🚀

