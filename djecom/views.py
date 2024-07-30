from django.shortcuts import render

# Create your views here.
def homepage(request):
    return render(request,'index.html')

def newArrivals(request):
    return render(request,'newArrivals.html')
