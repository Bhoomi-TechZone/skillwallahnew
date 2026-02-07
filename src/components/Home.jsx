import { lazy, Suspense } from "react";
import HomeSection1 from "./HomeSection1";

// Lazy load components that are below the fold for faster initial load
const CoursesWeOffer = lazy(() => import("./CoursesWeOffer"));
const WhoWeAreSection = lazy(() => import("./WhoWeAreSection"));
const RealWorldLearning = lazy(() => import("./RealWorldLearning"));
const StudentTestimonials = lazy(() => import("./StudentTestimonials"));
const EnrollmentCTA = lazy(() => import("./EnrollmentCTA"));

// Simple loading spinner component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
);

const Home = () => {
  return (
    <div className="m-0 p-0">
      <HomeSection1 />
      
      <Suspense fallback={<LoadingSpinner />}>
        <CoursesWeOffer />
      </Suspense>
      
      <Suspense fallback={<LoadingSpinner />}>
        <WhoWeAreSection />
      </Suspense>
      
      <Suspense fallback={<LoadingSpinner />}>
        <RealWorldLearning />
      </Suspense>
      
      <Suspense fallback={<LoadingSpinner />}>
        <StudentTestimonials />
      </Suspense>
      
      <Suspense fallback={<LoadingSpinner />}>
        <EnrollmentCTA />
      </Suspense>
    </div>
  );
};

export default Home;