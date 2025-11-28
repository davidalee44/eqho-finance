/**
 * LandingPage - Post-login company journey experience with timeline and animated rocket
 * 
 * Uses the Aceternity Timeline component for the scrolling timeline,
 * with a unified starry space background and scroll-synced rocket animation.
 * Shown after login as an intro/welcome experience.
 */
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Rocket, 
  Target, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Zap,
  ArrowRight,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelRocketTimeline } from './PixelRocketTimeline';

// Eqho brand colors
const COLORS = {
  teal: '#0EB9BC',
  cyan: '#09A3D5',
  purple: '#8866F4',
  deepPurple: '#502FEF',
};

/**
 * Timeline content cards - rendered inside the Aceternity Timeline
 */
const TimelineCard = ({ metric, description, icon: Icon, color }) => (
  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 mb-8">
    <div className="flex items-center gap-3 mb-4">
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}30` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <span 
        className="text-xl font-bold"
        style={{ color }}
      >
        {metric}
      </span>
    </div>
    <p className="text-gray-300 text-sm leading-relaxed">
      {description}
    </p>
  </div>
);

/**
 * Timeline data formatted for Aceternity Timeline component
 */
const timelineData = [
  {
    title: "Q1 2023",
    content: (
      <TimelineCard
        metric="Bootstrapped"
        description="Eqho, LLC formed. Bootstrapped by founder with vision to revolutionize customer service with AI voice agents. Initial product development begins."
        icon={Rocket}
        color={COLORS.teal}
      />
    ),
  },
  {
    title: "Q3 2023",
    content: (
      <TimelineCard
        metric="10 Beta Customers"
        description="First AI voice agent deployed to production. Initial beta customers onboarded for real-world testing. Product-market fit validation begins."
        icon={Zap}
        color={COLORS.cyan}
      />
    ),
  },
  {
    title: "Q1 2024",
    content: (
      <TimelineCard
        metric="$50K MRR"
        description="Achieved consistent MRR growth with strong retention. Validated core value proposition with towing industry. Net revenue retention exceeds 100%."
        icon={Target}
        color={COLORS.purple}
      />
    ),
  },
  {
    title: "Q3 2024",
    content: (
      <TimelineCard
        metric="$1M ARR"
        description="Major enterprise customers onboarded. Expanded into adjacent verticals. Annual recurring revenue milestone achieved ahead of schedule."
        icon={DollarSign}
        color={COLORS.deepPurple}
      />
    ),
  },
  {
    title: "Q4 2024",
    content: (
      <TimelineCard
        metric="17x LTV/CAC"
        description="Team expansion underway. Infrastructure scaled for growth. Unit economics validated at scale with industry-leading efficiency ratios."
        icon={Users}
        color={COLORS.teal}
      />
    ),
  },
  {
    title: "2025",
    content: (
      <TimelineCard
        metric="🚀 To the Moon"
        description="Expanding market presence. Building for the future. Seeking strategic partners for Series A funding round."
        icon={TrendingUp}
        color={COLORS.purple}
      />
    ),
  },
];

/**
 * Custom Timeline component that exposes scroll progress
 */
const EqhoTimeline = ({ onScrollProgress }) => {
  const containerRef = useRef(null);
  const ref = useRef(null);
  const [height, setHeight] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Report scroll progress to parent
  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (value) => {
      onScrollProgress?.(value);
    });
    return () => unsubscribe();
  }, [scrollYProgress, onScrollProgress]);

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div
      className="w-full font-sans md:px-10"
      ref={containerRef}
    >
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto py-20 px-4 md:px-8 lg:px-10">
        <div className="flex justify-start mb-8">
          <img 
            src="/eqho-light.png" 
            alt="Eqho" 
            className="h-12 md:h-16"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
        <h2 
          className="text-3xl md:text-5xl lg:text-6xl mb-4 text-white max-w-4xl font-bold"
          style={{ 
            fontFamily: "'Press Start 2P', system-ui",
            textShadow: '2px 2px 0px #ff00ff, -1px -1px 0px #00ffff',
            lineHeight: 1.3
          }}
        >
          Our Journey
        </h2>
        <p className="text-cyan-300 text-lg md:text-xl max-w-lg mb-4">
          From bootstrapped startup to industry leader
        </p>
        <p className="text-gray-400 text-sm md:text-base max-w-md">
          Scroll through our milestones to see how Eqho is transforming 
          customer engagement with AI-powered voice agents.
        </p>
      </div>

      {/* Timeline */}
      <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
        {timelineData.map((item, index) => (
          <div key={index} className="flex justify-start pt-10 md:pt-40 md:gap-10">
            <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
              <div className="h-10 absolute left-3 md:left-3 w-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <div className="h-4 w-4 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500" />
              </div>
              <h3 className="hidden md:block text-xl md:pl-20 md:text-5xl font-bold text-neutral-400">
                {item.title}
              </h3>
            </div>

            <div className="relative pl-20 pr-4 md:pl-4 w-full">
              <h3 className="md:hidden block text-2xl mb-4 text-left font-bold text-neutral-400">
                {item.title}
              </h3>
              {item.content}
            </div>
          </div>
        ))}

        {/* Animated progress line - more transparent purple */}
        <div
          style={{ height: height + "px" }}
          className="absolute md:left-8 left-8 top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent from-[0%] via-neutral-800 to-transparent to-[99%] [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
        >
          <motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-t from-purple-500/30 via-cyan-500/50 to-transparent from-[0%] via-[10%] rounded-full"
          />
        </div>
      </div>

      {/* Continue to Dashboard Section */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-10 py-20">
        <div className="flex justify-center">
          <motion.button
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-md border border-cyan-500/30 rounded-xl text-white font-semibold hover:border-cyan-400/50 transition-all"
          >
            <span>Continue to Dashboard</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

/**
 * CSS-based starfield background
 */
const StarfieldBackground = () => (
  <div className="fixed inset-0 z-0 overflow-hidden">
    {/* Dark space background - no purple overlay */}
    <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-gray-950 to-black" />
    
    {/* Stars layer 1 - small */}
    <div 
      className="absolute inset-0 opacity-70"
      style={{
        backgroundImage: `radial-gradient(1px 1px at 20px 30px, white, transparent),
                          radial-gradient(1px 1px at 40px 70px, white, transparent),
                          radial-gradient(1px 1px at 50px 160px, white, transparent),
                          radial-gradient(1px 1px at 90px 40px, white, transparent),
                          radial-gradient(1px 1px at 130px 80px, white, transparent),
                          radial-gradient(1px 1px at 160px 120px, white, transparent),
                          radial-gradient(1px 1px at 200px 200px, white, transparent),
                          radial-gradient(1px 1px at 250px 50px, white, transparent),
                          radial-gradient(1px 1px at 300px 150px, white, transparent),
                          radial-gradient(1px 1px at 350px 100px, white, transparent)`,
        backgroundRepeat: 'repeat',
        backgroundSize: '400px 400px',
      }}
    />
    
    {/* Stars layer 2 - medium */}
    <div 
      className="absolute inset-0 opacity-50"
      style={{
        backgroundImage: `radial-gradient(2px 2px at 100px 50px, white, transparent),
                          radial-gradient(2px 2px at 200px 150px, white, transparent),
                          radial-gradient(2px 2px at 300px 250px, white, transparent),
                          radial-gradient(2px 2px at 400px 100px, white, transparent),
                          radial-gradient(2px 2px at 500px 300px, white, transparent)`,
        backgroundRepeat: 'repeat',
        backgroundSize: '600px 400px',
      }}
    />
    
    {/* Stars layer 3 - large/bright with brand colors */}
    <div 
      className="absolute inset-0 opacity-30"
      style={{
        backgroundImage: `radial-gradient(3px 3px at 150px 100px, #0EB9BC, transparent),
                          radial-gradient(3px 3px at 450px 200px, #00ffff, transparent),
                          radial-gradient(3px 3px at 350px 350px, #0EB9BC, transparent)`,
        backgroundRepeat: 'repeat',
        backgroundSize: '800px 500px',
      }}
    />
  </div>
);

/**
 * Main Landing Page Component - Post-login journey experience
 */
export const LandingPage = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  // Add pixel font
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      const linkEl = document.head.querySelector('link[href*="Press+Start+2P"]');
      if (linkEl) document.head.removeChild(linkEl);
    };
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Starfield background - covers entire page */}
      <StarfieldBackground />
      
      {/* Fixed rocket on the right side */}
      <div className="fixed top-0 right-0 w-[40%] h-screen z-10 pointer-events-none hidden lg:block">
        <PixelRocketTimeline scrollProgress={scrollProgress} />
      </div>
      
      {/* Scrollable content */}
      <div className="relative z-20 lg:w-[60%]">
        <EqhoTimeline onScrollProgress={setScrollProgress} />
      </div>
      
      {/* Mobile: Show rocket in corner on small screens */}
      <div className="fixed bottom-4 right-4 w-32 h-32 z-30 lg:hidden pointer-events-none">
        <PixelRocketTimeline scrollProgress={scrollProgress} />
      </div>
    </div>
  );
};

export default LandingPage;
