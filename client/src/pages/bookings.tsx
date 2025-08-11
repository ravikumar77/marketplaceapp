
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Calendar, MapPin, User, DollarSign, Clock, Eye, X, Phone, Mail, Star, ArrowLeft, Filter, RefreshCw } from "lucide-react";

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings');
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: "✅ Success",
          description: "Booking cancelled successfully",
        });
        fetchBookings();
      } else {
        throw new Error('Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive",
      });
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'confirmed': 
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '✅',
          description: 'Your booking is confirmed and scheduled'
        };
      case 'pending': 
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '⏳',
          description: 'Waiting for provider confirmation'
        };
      case 'cancelled': 
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '❌',
          description: 'This booking has been cancelled'
        };
      case 'completed': 
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: '🏆',
          description: 'Service completed successfully'
        };
      default: 
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '📋',
          description: 'Status unknown'
        };
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === "all") return true;
    return booking.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gray-200 rounded-lg w-1/3"></div>
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card rounded-2xl h-48 p-6">
                  <div className="space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="hover-lift"
            >
              <ArrowLeft size={18} className="mr-2" />
              Back to Home
            </Button>
            <Button 
              variant="outline" 
              onClick={fetchBookings}
              className="hover-lift"
            >
              <RefreshCw size={18} className="mr-2" />
              Refresh
            </Button>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              My <span className="text-gradient">Bookings</span>
            </h1>
            <p className="text-xl text-gray-600">Track and manage your service bookings</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex justify-center mb-8">
            <div className="glass-card rounded-2xl p-2 inline-flex gap-2">
              {[
                { key: "all", label: "All Bookings", count: bookings.length },
                { key: "pending", label: "Pending", count: bookings.filter(b => b.status === 'pending').length },
                { key: "confirmed", label: "Confirmed", count: bookings.filter(b => b.status === 'confirmed').length },
                { key: "completed", label: "Completed", count: bookings.filter(b => b.status === 'completed').length },
                { key: "cancelled", label: "Cancelled", count: bookings.filter(b => b.status === 'cancelled').length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    filter === tab.key
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-white/60'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <Card className="glass-card border-0 shadow-xl rounded-3xl">
            <CardContent className="pt-16 pb-16">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
                  <AlertCircle className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  {filter === "all" ? "No bookings yet" : `No ${filter} bookings`}
                </h3>
                <p className="text-gray-600 mb-10 max-w-md mx-auto text-lg leading-relaxed">
                  {filter === "all" 
                    ? "Start exploring our amazing services and make your first booking today!"
                    : `You don't have any ${filter} bookings at the moment.`
                  }
                </p>
                <Button 
                  className="btn-gradient px-10 py-4 text-lg hover-lift"
                  onClick={() => window.location.href = '/'}
                >
                  Browse Services
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {filteredBookings.map((booking: any) => {
              const statusConfig = getStatusConfig(booking.status);
              return (
                <Card key={booking.id} className="futuristic-card border-0 shadow-lg hover-lift transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <CardTitle className="flex items-center gap-4 text-2xl">
                        <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <span className="text-gray-900">{booking.serviceType || 'Service Booking'}</span>
                          <p className="text-gray-500 text-base font-normal">Booking ID: {booking.id.slice(0, 8)}...</p>
                        </div>
                      </CardTitle>
                      <div className="text-right">
                        <Badge className={`${statusConfig.color} px-4 py-2 font-semibold border text-sm`}>
                          {statusConfig.icon} {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-2 max-w-xs">
                          {statusConfig.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      <div className="lg:col-span-3 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-4 p-4 glass-card rounded-xl">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                              <Calendar className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Date</p>
                              <p className="text-gray-900 font-bold text-lg">
                                {booking.scheduledStart 
                                  ? new Date(booking.scheduledStart).toLocaleDateString() 
                                  : 'Date not set'
                                }
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 p-4 glass-card rounded-xl">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                              <Clock className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Time</p>
                              <p className="text-gray-900 font-bold text-lg">
                                {booking.scheduledStart 
                                  ? new Date(booking.scheduledStart).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                  : 'Time not set'
                                }
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 p-4 glass-card rounded-xl">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                              <MapPin className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Location</p>
                              <p className="text-gray-900 font-bold">{booking.address || 'Address not provided'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 p-4 glass-card rounded-xl">
                            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                              <DollarSign className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Price</p>
                              <p className="text-gray-900 font-bold text-lg">
                                {booking.priceCharged ? `$${booking.priceCharged}` : 'Price pending'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {booking.requirements && (
                          <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">📝</span>
                              </div>
                              <p className="font-bold text-blue-900">Special Requirements</p>
                            </div>
                            <p className="text-blue-800 leading-relaxed">{booking.requirements}</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="text-center p-6 glass-card rounded-xl">
                          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Star className="h-8 w-8 text-white fill-current" />
                          </div>
                          <p className="text-sm font-semibold text-gray-600 mb-2">Booking Status</p>
                          <p className="text-2xl font-bold text-gray-900">{booking.status?.toUpperCase()}</p>
                        </div>

                        <div className="flex flex-col gap-3">
                          {(booking.status === 'pending' || booking.status === 'confirmed') && (
                            <Button 
                              variant="destructive" 
                              size="lg"
                              onClick={() => cancelBooking(booking.id)}
                              className="w-full hover:bg-red-600 transition-colors hover-lift"
                            >
                              <X className="h-5 w-5 mr-2" />
                              Cancel Booking
                            </Button>
                          )}

                          <Button 
                            variant="outline" 
                            size="lg"
                            className="w-full hover:bg-gray-50 border-gray-300 text-gray-700 hover:text-gray-900 transition-colors hover-lift"
                          >
                            <Eye className="h-5 w-5 mr-2" />
                            View Details
                          </Button>

                          <Button 
                            variant="outline" 
                            size="lg"
                            className="w-full hover:bg-blue-50 border-blue-300 text-blue-700 hover:text-blue-900 transition-colors hover-lift"
                          >
                            <Phone className="h-5 w-5 mr-2" />
                            Contact Provider
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
