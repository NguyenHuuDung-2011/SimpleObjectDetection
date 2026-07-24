from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import render

# Create your views here.
def home(request):
    get_token(request)
    return render(request, 'home.html')

def capture(request):
    if request.method == 'POST':
        if 'image' in request.FILES:
            image = request.FILES['image']

    return JsonResponse({'status': 'ok'})