
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Loader2, MapPin, Clock, DollarSign, User, Phone, Calendar, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Service {
  id: string;
  displayName: string;
  code?: string;
}

interface Provider {
  id: string;
  displayName: string;
  ratingAvg: number;
  reviewCount: number;
  distance: number;
  services: Array<{
    basePrice: string;
    priceUnit: string;
    service: Service;
  }>;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: Provider | null;
  service: Service | null;
  onSuccess: () => void;
}

export default function BookingModal({ isOpen, onClose, provider, service, onSuccess }: BookingModalProps) {
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    address: "",
    requirements: "",
    contactNumber: "",
    clientName: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!provider || !service) return;

    // Validate required fields
    if (!formData.clientName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.contactNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your phone number.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.date) {
      toast({
        title: "Validation Error", 
        description: "Please select a date.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.time) {
      toast({
        title: "Validation Error",
        description: "Please select a time slot.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.address.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter the service address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create proper ISO date string
      const scheduleDateTime = new Date(`${formData.date}T${formData.time}:00`);
      
      const bookingData = {
        providerId: provider.id,
        serviceId: service.id,
        clientPhone: formData.contactNumber,
        clientName: formData.clientName,
        serviceType: service.code || service.displayName,
        message: formData.requirements,
        address: formData.address,
        schedule: scheduleDateTime.toISOString(),
        paymentMethod: "online"
      };

      await apiRequest("POST", "/api/bookings", bookingData);

      toast({
        title: "🎉 Booking Confirmed!",
        description: "Your booking request has been submitted. The provider will contact you shortly.",
      });

      // Reset form
      setFormData({
        date: "",
        time: "",
        address: "",
        requirements: "",
        contactNumber: "",
        clientName: "",
      });

      onSuccess();
    } catch (error) {
      console.error("Booking submission error:", error);
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "There was an error submitting your booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
    }

    const emptyStars = 5 - fullStars;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }

    return stars;
  };

  const getEstimatedPrice = () => {
    if (!provider?.services || provider.services.length === 0) return "₹300 - ₹500";
    const selectedServiceInfo = provider.services.find(s => s.service.id === service?.id);
    if (selectedServiceInfo) {
        const basePrice = selectedServiceInfo.basePrice;
        const unit = selectedServiceInfo.priceUnit;
        return `₹${basePrice}/${unit.replace('per_', '')}`;
    }
    const basePrice = provider.services[0].basePrice;
    const unit = provider.services[0].priceUnit;
    return `₹${basePrice}/${unit.replace('per_', '')}`;
  };

  const getAvatarUrl = () => {
    return "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face";
  };

  if (!provider || !service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
        <div className="futuristic-card border-0 shadow-none">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-3xl font-bold text-gray-900 text-center">
              Book Your <span className="text-gradient">Service</span>
            </DialogTitle>
          </DialogHeader>

          {/* Provider Summary */}
          <div className="glass-card rounded-2xl p-6 mb-8 border border-purple-100">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src={getAvatarUrl()}
                  alt={provider.displayName}
                  className="w-16 h-16 rounded-full object-cover ring-4 ring-purple-100"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-xl text-gray-900">{provider.displayName}</h4>
                <p className="text-purple-600 font-semibold">{service.displayName}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <div className="flex items-center">
                    {renderStars(provider.ratingAvg)}
                  </div>
                  <span className="text-sm text-gray-600 font-medium">
                    {provider.ratingAvg.toFixed(1)} ({provider.reviewCount} reviews) • {provider.distance.toFixed(1)} km away
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">{getEstimatedPrice()}</div>
                <div className="text-sm text-gray-500">Estimated cost</div>
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <Label htmlFor="client-name" className="form-label flex items-center gap-2">
                  <User size={16} className="text-purple-600" />
                  Your Name
                </Label>
                <Input
                  id="client-name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.clientName}
                  onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <Label htmlFor="contact-number" className="form-label flex items-center gap-2">
                  <Phone size={16} className="text-purple-600" />
                  Phone Number
                </Label>
                <Input
                  id="contact-number"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                  required
                  className="form-input"
                />
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <Label htmlFor="booking-date" className="form-label flex items-center gap-2">
                  <Calendar size={16} className="text-purple-600" />
                  Preferred Date
                </Label>
                <Input
                  id="booking-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <Label htmlFor="booking-time" className="form-label flex items-center gap-2">
                  <Clock size={16} className="text-purple-600" />
                  Preferred Time
                </Label>
                <Select value={formData.time} onValueChange={(value) => setFormData({ ...formData, time: value })}>
                  <SelectTrigger className="form-input">
                    <SelectValue placeholder="Select time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="09:00">9:00 AM - 10:00 AM</SelectItem>
                    <SelectItem value="10:00">10:00 AM - 11:00 AM</SelectItem>
                    <SelectItem value="11:00">11:00 AM - 12:00 PM</SelectItem>
                    <SelectItem value="14:00">2:00 PM - 3:00 PM</SelectItem>
                    <SelectItem value="15:00">3:00 PM - 4:00 PM</SelectItem>
                    <SelectItem value="16:00">4:00 PM - 5:00 PM</SelectItem>
                    <SelectItem value="17:00">5:00 PM - 6:00 PM</SelectItem>
                    <SelectItem value="18:00">6:00 PM - 7:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Service Location */}
            <div className="form-group">
              <Label htmlFor="service-address" className="form-label flex items-center gap-2">
                <MapPin size={16} className="text-purple-600" />
                Service Location
              </Label>
              <Input
                id="service-address"
                type="text"
                placeholder="Enter the complete address where service is needed"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                required
                className="form-input"
              />
            </div>

            {/* Special Requirements */}
            <div className="form-group">
              <Label htmlFor="requirements" className="form-label flex items-center gap-2">
                <FileText size={16} className="text-purple-600" />
                Special Requirements
              </Label>
              <Textarea
                id="requirements"
                placeholder="Any special instructions, requirements, or notes for the service provider..."
                value={formData.requirements}
                onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                className="form-input min-h-[120px] resize-none"
              />
            </div>

            {/* Price Summary */}
            <div className="glass-card rounded-2xl p-6 border border-green-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="text-green-600" size={20} />
                  <span className="text-lg font-semibold text-gray-800">Estimated Cost</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{getEstimatedPrice()}</span>
              </div>
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <strong>Note:</strong> This is an estimated cost. The final price will be confirmed by the provider based on the actual scope of work and may vary depending on materials needed, complexity, and duration of service.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 h-14 text-lg font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 btn-gradient h-14 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Booking...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-5 w-5" />
                    Confirm Booking
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
