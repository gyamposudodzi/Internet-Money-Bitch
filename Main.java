import java.util.ArrayList;

public class Main {

    // Method to calculate the average stock price
    public static float calculateAveragePrice(float[] prices) {
        float sum = 0;

        for (int i = 0; i < prices.length; i++) {
            sum += prices[i];
        }

        return sum / prices.length;
    }

    // Method to find the maximum stock price
    public static float findMaximumPrice(float[] prices) {
        float maxPrice = prices[0];

        for (int i = 1; i < prices.length; i++) {
            if (prices[i] > maxPrice) {
                maxPrice = prices[i];
            }
        }

        return maxPrice;
    }

    // Method to count occurrences of a specific stock price
    public static int countOccurrences(float[] prices, float targetPrice) {
        int count = 0;

        for (int i = 0; i < prices.length; i++) {
            if (prices[i] == targetPrice) {
                count++;
            }
        }

        return count;
    }

    // Method to compute cumulative sum using ArrayList
    public static ArrayList<Float> computeCumulativeSum(ArrayList<Float> pricesList) {

        ArrayList<Float> cumulativeSumList = new ArrayList<>();

        float sum = 0;

        for (int i = 0; i < pricesList.size(); i++) {
            sum += pricesList.get(i);
            cumulativeSumList.add(sum);
        }

        return cumulativeSumList;
    }

    // Main method
    public static void main(String[] args) {

        // Array containing stock prices for 10 days
        float[] stockPrices = {
                120.5f, 122.0f, 119.8f, 125.4f, 122.0f,
                128.6f, 130.2f, 127.5f, 122.0f, 131.4f
        };

        // ArrayList containing stock prices
        ArrayList<Float> stockPriceList = new ArrayList<>();

        for (float price : stockPrices) {
            stockPriceList.add(price);
        }

        // Calculate average price
        float averagePrice = calculateAveragePrice(stockPrices);

        // Find maximum price
        float maximumPrice = findMaximumPrice(stockPrices);

        // Count occurrences of a target price
        float targetPrice = 122.0f;
        int occurrenceCount = countOccurrences(stockPrices, targetPrice);

        // Compute cumulative sum
        ArrayList<Float> cumulativeSums =
                computeCumulativeSum(stockPriceList);

        // Display results
        System.out.println("Stock Prices Analysis");
        System.out.println("----------------------");

        System.out.println("Average Stock Price: " + averagePrice);

        System.out.println("Maximum Stock Price: " + maximumPrice);

        System.out.println("Occurrences of " + targetPrice +
                ": " + occurrenceCount);

        System.out.println("Cumulative Sum of Stock Prices:");

        for (Float value : cumulativeSums) {
            System.out.println(value);
        }
    }
}