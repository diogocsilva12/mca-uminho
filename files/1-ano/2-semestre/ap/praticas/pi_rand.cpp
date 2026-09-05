/* C++ program for estimation of Pi using Monte
   Carlo Simulation */
#include <stddef.h>
#include <stdlib.h>
#include <iostream>

// Defines precision for x and y values. More the
// interval, more the number of significant digits
#define INTERVAL 10000
using namespace std;

int main()
{
    double pi;
    int circle_points = 0, square_points = 0;
    
    // Initializing rand()
    srand(/*time(NULL)*/0);
    
    // Total Random numbers generated = possible x
    // values * possible y values
    for (int i = 0; i < (INTERVAL * INTERVAL); i++) {
        
        // Randomly generated x and y values
        double rand_x = double(rand() % (INTERVAL + 1)) / INTERVAL;
        double rand_y = double(rand() % (INTERVAL + 1)) / INTERVAL;
        
        // Distance between (x, y) from the origin
        double origin_dist = rand_x * rand_x + rand_y * rand_y;
        
        // Checking if (x, y) lies inside the define
        // circle with R=1
        if (origin_dist <= 1)
            circle_points++;
        
        // Total number of points generated
        square_points++;
    }
    
    // Final Estimated Pi Value
    pi = double(4 * circle_points) / square_points;
    cout << "\nFinal Estimation of Pi = " << pi;
    
    return 0;
}
