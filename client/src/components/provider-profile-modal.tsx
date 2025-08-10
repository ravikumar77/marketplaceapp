import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Phone, MessageSquare, Loader2 } from "lucide-react";

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
  about: string;
  distance: number;
  services: Array<{
    basePrice: string;
    priceUnit: string;
    description: string;
    service: Service;
  }>;
  reviews?: Array<{
    rating: number;
    comment: string;
    createdAt: string;
    client: {
      name: string;
    };
  }>;
}

interface ProviderProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: Provider | null;
  onBookService: (provider: Provider, service: Service) => void;
}

export default function ProviderProfileModal({ isOpen, onClose, provider, onBookService }: ProviderProfileModalProps) {
  const [providerDetails, setProviderDetails] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && provider) {
      fetchProviderDetails();
    }
  }, [isOpen, provider]);

  const fetchProviderDetails = async () => {
    if (!provider) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/providers/${provider.id}`);
      if (response.ok) {
        const details = await response.json();
        setProviderDetails(details);
      }
    } catch (error) {
      console.error("Error fetching provider details:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-accent text-accent" />);
    }
    
    const emptyStars = 5 - fullStars;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-accent" />);
    }
    
    return stars;
  };

  const getAvatarUrl = () => {
    return "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  };

  if (!provider) return null;

  const displayProvider = providerDetails || provider;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Provider Profile</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Provider Header */}
            <div className="flex items-start space-x-4">
              <img 
                src={getAvatarUrl()}
                alt={displayProvider.displayName}
                className="w-20 h-20 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="text-xl font-semibold text-text-primary">{displayProvider.displayName}</h4>
                  {displayProvider.verified && (
                    <Badge className="bg-success/10 text-success hover:bg-success/20">
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-text-secondary mb-2">
                  {displayProvider.services[0]?.service.displayName} Specialist
                </p>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <div className="flex">
                      {renderStars(displayProvider.ratingAvg)}
                    </div>
                    <span className="font-medium">{displayProvider.ratingAvg.toFixed(1)}</span>
                    <span className="text-text-secondary">({displayProvider.reviewCount} reviews)</span>
                  </div>
                  <div className="flex items-center text-text-secondary">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{displayProvider.distance.toFixed(1)} km away</span>
                  </div>
                </div>
              </div>
            </div>

            {/* About */}
            <div>
              <h5 className="font-semibold text-text-primary mb-3">About</h5>
              <p className="text-text-secondary text-sm leading-relaxed">
                {displayProvider.about || "Professional service provider with years of experience."}
              </p>
            </div>

            {/* Services & Pricing */}
            <div>
              <h5 className="font-semibold text-text-primary mb-3">Services & Pricing</h5>
              <div className="space-y-3">
                {displayProvider.services.map((service, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-text-primary">{service.service.displayName}</span>
                      <p className="text-sm text-text-secondary">
                        {service.description || "Professional service"}
                      </p>
                    </div>
                    <span className="font-semibold text-primary">
                      ₹{service.basePrice}/{service.priceUnit.replace('per_', '')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Reviews */}
            {displayProvider.reviews && displayProvider.reviews.length > 0 && (
              <div>
                <h5 className="font-semibold text-text-primary mb-3">Recent Reviews</h5>
                <div className="space-y-4">
                  {displayProvider.reviews.slice(0, 3).map((review, index) => (
                    <div key={index} className="border-l-4 border-primary pl-4">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-text-primary text-sm">
                          {review.client.name}
                        </span>
                        <div className="flex">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-text-secondary leading-relaxed mb-1">
                          {review.comment}
                        </p>
                      )}
                      <span className="text-xs text-text-secondary">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t">
              <Button 
                className="flex-1 bg-primary text-white hover:bg-blue-700"
                onClick={() => displayProvider.services[0] && onBookService(displayProvider, displayProvider.services[0].service)}
              >
                Book Service
              </Button>
              <Button variant="outline" size="icon">
                <Phone className="w-4 h-4 text-text-secondary" />
              </Button>
              <Button variant="outline" size="icon">
                <MessageSquare className="w-4 h-4 text-text-secondary" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
