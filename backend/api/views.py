from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.http import FileResponse
from .models import Model3D
from .serializers import Model3DSerializer
import os

# Create your views here.

class Model3DViewSet(viewsets.ModelViewSet):
    queryset = Model3D.objects.all()
    serializer_class = Model3DSerializer

    def create(self, request, *args, **kwargs):
        # Get the file from the request
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        # Get file format from the file extension
        file_format = file_obj.name.split('.')[-1].lower()
        if file_format not in ['stl', 'obj']:
            return Response({'error': 'Invalid file format'}, status=status.HTTP_400_BAD_REQUEST)

        # Create the model instance
        serializer = self.get_serializer(data={
            'name': request.data.get('name', file_obj.name),
            'file': file_obj,
            'file_format': file_format
        })
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        model = self.get_object()
        file_path = model.file.path
        return FileResponse(open(file_path, 'rb'), as_attachment=True)
