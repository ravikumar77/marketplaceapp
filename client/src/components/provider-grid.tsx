import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Eye } from "lucide-react";

interface Service {
  id: string;
  displayName: string;
}

interface Provider {
  id: string;
  displayName: string;
  ratingAvg: number;
  reviewCount: number;
  verified: boolean;
  services: Array<{
    basePrice: string;
    priceUnit: string;
    service: Service;
  }>;
  distance: number;
}

interface ProviderGridProps {
  providers: Provider[];
  onBookService: (provider: Provider, service: Service) => void;
  onViewProfile: (provider: Provider) => void;
}

export default function ProviderGrid({ providers, onBookService, onViewProfile }: ProviderGridProps) {
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-accent text-accent" />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 fill-accent/50 text-accent" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-accent" />);
    }

    return stars;
  };

  const getAvatarUrl = (name: string, index: number) => {
    const avatars = [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face",
    ];
    return avatars[index % avatars.length];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {providers.map((provider, index) => {
        const primaryService = provider.services[0];
        
        return (
          <div key={provider.id} className="group glass-card rounded-2xl hover-lift overflow-hidden">
            {/* Card Header with Gradient */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-1 rounded-t-2xl">
              <div className="bg-white rounded-t-xl p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <img 
                        src={getAvatarUrl(provider.displayName, index)}
                        alt={`${provider.displayName} profile`}
                        className="w-16 h-16 rounded-2xl object-cover shadow-soft ring-4 ring-white"
                      />
                      {provider.verified && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-soft">
                          <i className="fas fa-check text-white text-xs"></i>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-text-primary mb-1 group-hover:text-primary transition-colors">
                        {provider.displayName}
                      </h3>
                      <p className="text-sm text-text-secondary font-medium flex items-center gap-2">
                        <i className="fas fa-toolbox text-primary/70"></i>
                        {primaryService?.service.displayName || "Service Provider"}
                      </p>
                    </div>
                  </div>
                  
                  {provider.verified && (
                    <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 shadow-soft font-medium">
                      <i className="fas fa-shield-alt mr-1"></i>
                      Verified
                    </Badge>
                  )}
                </div>

                {/* Rating and Distance */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 bg-yellow-50 px-3 py-1 rounded-full">
                      <div className="flex">
                        {renderStars(provider.ratingAvg)}
                      </div>
                      <span className="text-sm font-bold text-text-primary ml-1">
                        {provider.ratingAvg.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-sm text-text-secondary font-medium">
                      ({provider.reviewCount} reviews)
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-text-secondary text-sm mb-4">
                  <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    <span className="font-medium text-indigo-700">{provider.distance.toFixed(1)} km away</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    <i className="fas fa-clock"></i>
                    <span className="text-sm font-medium">Available today</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6 pt-0">
              {/* Pricing */}
              {primaryService && (
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-5 mb-6 border border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm text-slate-600 font-semibold">Starting from</span>
                      <p className="text-xs text-slate-500 mt-1 flex items-center">
                        <i className="fas fa-info-circle mr-1 text-slate-400"></i>
                        Final price may vary
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-slate-800">
                        ₹{primaryService.basePrice}
                      </div>
                      <div className="text-sm text-slate-600 font-medium">
                        per {primaryService.priceUnit.replace('per_', '')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Service Features */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <i className="fas fa-calendar-check text-emerald-600"></i>
                  <span className="text-slate-600 font-medium">Same-day booking</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <i className="fas fa-money-bill-wave text-indigo-600"></i>
                  <span className="text-slate-600 font-medium">Fair pricing</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <i className="fas fa-tools text-purple-600"></i>
                  <span className="text-slate-600 font-medium">Own equipment</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <i className="fas fa-thumbs-up text-amber-600"></i>
                  <span className="text-slate-600 font-medium">100% satisfaction</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button 
                  className="flex-1 btn-gradient h-12 rounded-xl font-semibold text-base shadow-soft"
                  onClick={() => primaryService && onBookService(provider, primaryService.service)}
                >
                  <i className="fas fa-calendar-plus mr-2"></i>
                  Book Now
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => onViewProfile(provider)}
                  className="px-4 h-12 rounded-xl border-2 hover:bg-gray-50 hover:border-primary transition-all duration-300"
                >
                  <Eye className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors" />
                </Button>
              </div>

              {/* Quick Contact */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-text-secondary text-center">
                  <i className="fas fa-phone mr-1 text-green-500"></i>
                  Quick response • Professional service • Insured work
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
